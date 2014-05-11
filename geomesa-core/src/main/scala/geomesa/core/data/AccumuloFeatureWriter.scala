/*
 * Copyright 2013 Commonwealth Computer Research, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


package geomesa.core.data

import collection.JavaConversions._
import collection.JavaConverters._
import geomesa.core.index._
import java.nio.charset.StandardCharsets
import java.util.UUID
import org.apache.accumulo.core.client.{BatchWriterConfig, Connector}
import org.apache.accumulo.core.data.{Mutation, Value, Key}
import org.apache.hadoop.io.Text
import org.apache.hadoop.mapred.{Reporter, RecordWriter}
import org.apache.hadoop.mapreduce.TaskInputOutputContext
import org.apache.log4j.Logger
import org.geotools.data.DataUtilities
import org.geotools.data.simple.SimpleFeatureWriter
import org.geotools.factory.Hints
import org.geotools.feature.simple.SimpleFeatureBuilder
import org.opengis.feature.simple.{SimpleFeature, SimpleFeatureType}

object AccumuloFeatureWriter {

  type AccumuloRecordWriter = RecordWriter[Key, Value]

  val EMPTY_VALUE = new Value()

  class LocalRecordDeleter(tableName: String, connector: Connector) extends AccumuloRecordWriter {
    private val bw = connector.createBatchWriter(tableName, new BatchWriterConfig())

    def write(key: Key, value: Value) {
      val m = new Mutation(key.getRow)
      m.putDelete(key.getColumnFamily, key.getColumnQualifier, key.getColumnVisibilityParsed, key.getTimestamp)
      bw.addMutation(m)
    }

    def close(reporter: Reporter) {
      bw.flush()
      bw.close()
    }
  }

  class MapReduceRecordWriter(context: TaskInputOutputContext[_,_,Key,Value]) extends AccumuloRecordWriter {
    def write(key: Key, value: Value) {
      context.write(key, value)
    }

    def close(reporter: Reporter) {}
  }
}

abstract class AccumuloFeatureWriter(featureType: SimpleFeatureType,
                                     indexer: SpatioTemporalIndexSchema,
                                     connector: Connector,
                                     encoder: SimpleFeatureEncoder,
                                     ds: AccumuloDataStore) extends SimpleFeatureWriter {

  private val log = Logger.getLogger(classOf[AccumuloFeatureWriter])
  protected val multiBWWriter = connector.createMultiTableBatchWriter(new BatchWriterConfig)
  protected val recordWriter  = multiBWWriter.getBatchWriter(ds.getRecordTableForType(featureType))
  protected val stIdxWriter   = multiBWWriter.getBatchWriter(ds.getSTIdxTableForType(featureType))
  protected val attrIdxWriter = multiBWWriter.getBatchWriter(ds.getAttrIdxTableForType(featureType))

  def getFeatureType: SimpleFeatureType = featureType

  /* Return a String representing nextId - use UUID.random for universal uniqueness across multiple ingest nodes */
  protected def nextFeatureId = UUID.randomUUID().toString

  protected val builder = new SimpleFeatureBuilder(featureType)

  protected def writeToAccumulo(feature: SimpleFeature) = {
    // see if there's a suggested ID to use for this feature
    // (relevant when this insertion is wrapped inside a Transaction)
    val toWrite =
      if(feature.getUserData.containsKey(Hints.PROVIDED_FID)) {
        builder.init(feature)
        builder.buildFeature(feature.getUserData.get(Hints.PROVIDED_FID).toString)
      }
      else feature

    // require non-null geometry to write to geomesa (can't index null geo yo!)
    if (toWrite.getDefaultGeometry != null) {
      writeRecord(feature)
      writeSTIdx(feature)
      writeAttrIdx(feature)
    } else {
      log.warn("Invalid feature to write:  " + DataUtilities.encodeFeature(toWrite))
      List()
    }
  }

  private def writeRecord(feature: SimpleFeature): Unit = {
    val m = new Mutation(feature.getID)
    m.put(SFT_CF, EMPTY_COLQ, encoder.encode(feature))
    recordWriter.addMutation(m)
  }

  private def writeSTIdx(feature: SimpleFeature): Unit = {
    val KVs = indexer.encode(feature)
    val m = KVs.groupBy { case (k, _) => k.getRow }.map { case (row, kvs) => kvsToMutations(row, kvs) }
    stIdxWriter.addMutations(m.asJava)
  }

  private val nullByte = Array[Byte](0)
  private def writeAttrIdx(feature: SimpleFeature): Unit = {
    val muts = getAttrIdxMutations(feature, new Text(feature.getID)).map {
      case PutOrDeleteMutation(row, cf, cq, v) =>
        val m = new Mutation(row)
        m.put(cf, cq, v)
        m
    }
    attrIdxWriter.addMutations(muts)
  }

  case class PutOrDeleteMutation(row: Array[Byte], cf: Text, cq: Text, v: Value)
  def getAttrIdxMutations(feature: SimpleFeature, cf: Text) =
    featureType.getAttributeDescriptors.map { attr =>
      val attrName = attr.getLocalName.getBytes(StandardCharsets.UTF_8)
      val attrValue = valOrNull(feature.getAttribute(attr.getName)).getBytes(StandardCharsets.UTF_8)
      val row = attrName ++ nullByte ++ attrValue
      PutOrDeleteMutation(row, cf, EMPTY_COLQ, EMPTY_VALUE)
    }

  private val nullString = "<null>"
  private def valOrNull(o: AnyRef) = if(o == null) nullString else o.toString

  private def kvsToMutations(row: Text, kvs: Seq[(Key, Value)]): Mutation = {
    val m = new Mutation(row)
    kvs.foreach { case (k, v) =>
      m.put(k.getColumnFamily, k.getColumnQualifier, k.getColumnVisibilityParsed, k.getTimestamp, v)
    }
    m
  }

  def close() = {
    recordWriter.close()
    stIdxWriter.close()
    attrIdxWriter.close()
  }

  def remove() {}

  def hasNext: Boolean = false
}



class AppendAccumuloFeatureWriter(featureType: SimpleFeatureType,
                                  indexer: SpatioTemporalIndexSchema,
                                  connector: Connector,
                                  encoder: SimpleFeatureEncoder,
                                  ds: AccumuloDataStore)
  extends AccumuloFeatureWriter(featureType, indexer, connector, encoder, ds) {

  var currentFeature: SimpleFeature = null

  def write() {
    if (currentFeature != null) writeToAccumulo(currentFeature)
    currentFeature = null
  }

  def next(): SimpleFeature = {
    currentFeature = SimpleFeatureBuilder.template(featureType, nextFeatureId)
    currentFeature
  }

}

class ModifyAccumuloFeatureWriter(featureType: SimpleFeatureType,
                                  indexer: SpatioTemporalIndexSchema,
                                  connector: Connector,
                                  encoder: SimpleFeatureEncoder,
                                  dataStore: AccumuloDataStore)
  extends AccumuloFeatureWriter(featureType, indexer, connector, encoder, dataStore) {

  val reader = dataStore.getFeatureReader(featureType.getName.toString)
  var live: SimpleFeature = null      /* feature to let user modify   */
  var original: SimpleFeature = null  /* feature returned from reader */

  override def remove() =
    if (original != null) {
      removeRecord(original)
      removeSTIdx(original)
      removeAttrIdx(original)
    }

  private def removeRecord(feature: SimpleFeature) =
    connector
      .tableOperations()
      .deleteRows(
        dataStore.getRecordTableForType(featureType),
        new Text(feature.getID),
        new Text(feature.getID))

  private def removeSTIdx(feature: SimpleFeature) =
    indexer.encode(original).foreach { case (key, _) =>
      val m = new Mutation(key.getRow)
      m.putDelete(key.getColumnFamily, key.getColumnQualifier, key.getColumnVisibilityParsed, key.getTimestamp)
      stIdxWriter.addMutation(m)
    }

  private def removeAttrIdx(feature: SimpleFeature) =
    getAttrIdxMutations(feature, new Text(feature.getID)).map {
      case PutOrDeleteMutation(row, cf, cq, _) =>
        val m = new Mutation(row)
        m.putDelete(cf, cq)
    }

  override def hasNext = reader.hasNext

  /* only write if non null and it hasn't changed...*/
  /* original should be null only when reader runs out */
  override def write() =
    if(!live.equals(original)) {  // This depends on having the same SimpleFeature concrete class
      if(original != null) remove()
      writeToAccumulo(live)
    }

  override def next: SimpleFeature = {
    original = null
    live =
      if(hasNext) {
        original = reader.next()
        builder.init(original)
        builder.buildFeature(original.getID)
      } else {
        SimpleFeatureBuilder.template(featureType, nextFeatureId)
      }
    live
  }

  override def close() = {
    super.close() //closes writer
    reader.close()
  }

}