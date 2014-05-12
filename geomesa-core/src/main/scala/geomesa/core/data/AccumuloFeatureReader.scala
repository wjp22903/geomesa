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
import geomesa.core.iterators.DensityIterator
import java.nio.charset.StandardCharsets
import org.apache.accumulo.core.data.{Range, Value}
import org.apache.hadoop.io.Text
import org.geotools.data.{DataUtilities, Query, FeatureReader}
import org.geotools.factory.CommonFactoryFinder
import org.geotools.factory.Hints.{IntegerKey, ClassKey}
import org.geotools.filter.text.ecql.ECQL
import org.geotools.geometry.jts.ReferencedEnvelope
import org.opengis.feature.simple.{SimpleFeature, SimpleFeatureType}
import org.opengis.filter.PropertyIsEqualTo
import org.opengis.filter.expression.{Literal, PropertyName}
import org.opengis.filter.spatial.Equals
import org.geotools.metadata.iso.extent.GeographicBoundingBoxImpl

class AccumuloFeatureReader(dataStore: AccumuloDataStore,
                            featureName: String,
                            query: Query,
                            indexSchemaFmt: String,
                            attributes: String,
                            sft: SimpleFeatureType,
                            featureEncoder: SimpleFeatureEncoder)
  extends FeatureReader[SimpleFeatureType, SimpleFeature] {

  import AccumuloFeatureReader._

  val ff = CommonFactoryFinder.getFilterFactory2
  val indexSchema = SpatioTemporalIndexSchema(indexSchemaFmt, sft, featureEncoder)
  val geometryPropertyName = sft.getGeometryDescriptor.getName.toString
  val encodedSFT           = DataUtilities.encodeType(sft)

  val projectedSFT =
    if(query.getHints.containsKey(DENSITY_KEY)) DataUtilities.createType(sft.getTypeName, "encodedraster:String,geom:Point:srid=4326")
    else sft

  val derivedQuery =
    if(query.getHints.containsKey(BBOX_KEY)) {
      val env = query.getHints.get(BBOX_KEY).asInstanceOf[ReferencedEnvelope]
      val q1 = new Query(sft.getTypeName, ff.bbox(ff.property(sft.getGeometryDescriptor.getLocalName), env))
      DataUtilities.mixQueries(q1, query, "geomesa.mixed.query")
    } else query

  val filterVisitor = new FilterToAccumulo(sft)
  val rewrittenCQL = filterVisitor.visit(derivedQuery)
  val cqlString = ECQL.toCQL(rewrittenCQL)

  val spatial = filterVisitor.spatialPredicate
  val temporal = filterVisitor.temporalPredicate

  lazy val bs = dataStore.createBatchScanner(sft)
  lazy val iter = {
    val transformOption = Option(query.getHints.get(TRANSFORMS)).map(_.asInstanceOf[String])
    val transformSchema = Option(query.getHints.get(TRANSFORM_SCHEMA)).map(_.asInstanceOf[SimpleFeatureType])
    if (query.getHints.containsKey(DENSITY_KEY)) {
      val width = query.getHints.get(WIDTH_KEY).asInstanceOf[Integer]
      val height = query.getHints.get(HEIGHT_KEY).asInstanceOf[Integer]
      val q = indexSchema.query(bs, spatial, temporal, encodedSFT, Some(cqlString),
        transformOption, transformSchema, density = true, width, height)
      unpackDensityFeatures(q)
    } else {
      // TODO: push query planning down into the indexSchema including optimizing for
      // attribute-only queries
      rewrittenCQL match {
        case isEqualsTo: PropertyIsEqualTo => processPropertyIsEqualsTo(isEqualsTo)
        case _ =>
          val q = indexSchema.query(bs, spatial, temporal, encodedSFT, Some(cqlString),
            transformOption, transformSchema, density = false)
          val result = transformSchema.map { tschema => q.map { v => featureEncoder.decode(tschema, v) } }
          result.getOrElse(q.map { v => featureEncoder.decode(sft, v) })
      }
    }
  }

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

  def unpackDensityFeatures(iter: Iterator[Value]) =
    iter.flatMap { i => DensityIterator.expandFeature(featureEncoder.decode(projectedSFT, i)) }

  override def getFeatureType = sft

  override def next() = iter.next()

  override def hasNext = iter.hasNext

  override def close() = bs.close()
}

object AccumuloFeatureReader {
  val DENSITY_KEY = new ClassKey(classOf[java.lang.Boolean])
  val WIDTH_KEY   = new IntegerKey(256)
  val HEIGHT_KEY  = new IntegerKey(256)
  val BBOX_KEY    = new ClassKey(classOf[ReferencedEnvelope])


}
