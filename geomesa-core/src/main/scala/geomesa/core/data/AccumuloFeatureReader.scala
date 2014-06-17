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
import geomesa.core.index._
import java.nio.charset.StandardCharsets
import org.apache.accumulo.core.data.Range
import org.apache.hadoop.io.Text
import org.geotools.data.{Query, FeatureReader}
import org.opengis.feature.simple.{SimpleFeature, SimpleFeatureType}
import org.opengis.filter.PropertyIsEqualTo
import org.opengis.filter.expression.{Literal, PropertyName}

class AccumuloFeatureReader(dataStore: AccumuloDataStore,
                            query: Query,
                            indexSchemaFmt: String,
                            sft: SimpleFeatureType,
                            featureEncoder: SimpleFeatureEncoder)
  extends FeatureReader[SimpleFeatureType, SimpleFeature] {

  val indexSchema = IndexSchema(indexSchemaFmt, sft, featureEncoder)
  val bs = dataStore.createBatchScanner(sft)
  val iter = indexSchema.query(query, bs)
  val NULLBYTE = Array[Byte](0.toByte)
  def processPropertyIsEqualsTo(filter: PropertyIsEqualTo) = {
    val attrScanner = dataStore.createAttrIdxScanner(sft)
    val recordScanner = dataStore.createRecordScanner(sft)

    val one = filter.getExpression1
    val two = filter.getExpression2
    val (prop, lit) = (one, two) match {
      case (p: PropertyName, l: Literal) => (p.getPropertyName, l.getValue.toString)
      case (l: Literal, p: PropertyName) => (p.getPropertyName, l.getValue.toString)
    }

    val range = new Text(prop.getBytes(StandardCharsets.UTF_8) ++ NULLBYTE ++ lit.getBytes(StandardCharsets.UTF_8))
    attrScanner.setRange(new Range(range))
    val ids = attrScanner.iterator().map { _.getKey.getColumnFamily.toString }
    recordScanner.setRanges(ids.map { i => new Range(i) }.toList)
    recordScanner.iterator().map { _.getValue }.map { v => featureEncoder.decode(sft, v) }
  }

  override def getFeatureType = sft

  override def next() = iter.next()

  override def hasNext = iter.hasNext

  override def close() = bs.close()
}
