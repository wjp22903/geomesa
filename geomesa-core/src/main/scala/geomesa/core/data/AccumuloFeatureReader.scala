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

import com.vividsolutions.jts.geom._
import geomesa.core.index._
import org.geotools.data.{DataUtilities, Query, FeatureReader}
import org.geotools.factory.CommonFactoryFinder
import org.geotools.filter.text.ecql.ECQL
import org.opengis.feature.simple.{SimpleFeature, SimpleFeatureType}
import geomesa.utils.geohash.GeohashUtils
import org.apache.accumulo.core.data.Value
import org.geotools.data.{DataUtilities, Query, FeatureReader}
import org.geotools.factory.Hints.{IntegerKey, ClassKey}
import org.geotools.filter.text.ecql.ECQL
import org.opengis.feature.simple.{SimpleFeature, SimpleFeatureType}
import org.opengis.filter.Filter
import geomesa.core.iterators.DensityIterator
import org.geotools.geometry.jts.ReferencedEnvelope
import org.geotools.factory.CommonFactoryFinder

class AccumuloFeatureReader(dataStore: AccumuloDataStore,
                            featureName: String,
                            query: Query,
                            indexSchemaFmt: String,
                            attributes: String,
                            sft: SimpleFeatureType)
  extends FeatureReader[SimpleFeatureType, SimpleFeature] {

  import AccumuloFeatureReader._
  import collection.JavaConversions._

  val ff = CommonFactoryFinder.getFilterFactory2(null)

  val densitySFT = DataUtilities.createType(sft.getTypeName, "encodedraster:String,geom:Point:srid=4326")
  val projectedSFT = if(query.getHints.containsKey(DENSITY_KEY)) densitySFT else sft

  val derivedQuery =
    if(query.getHints.containsKey(BBOX_KEY)) {
      val env = query.getHints.get(BBOX_KEY).asInstanceOf[ReferencedEnvelope]
      val q1 = new Query(sft.getTypeName, ff.bbox(ff.property(sft.getGeometryDescriptor.getLocalName), env))
      DataUtilities.mixQueries(q1, query, "geomesa.mixed.query")
    } else query

  lazy val ff = CommonFactoryFinder.getFilterFactory2
  lazy val indexSchema = SpatioTemporalIndexSchema(indexSchemaFmt, sft)
  lazy val geometryPropertyName = sft.getGeometryDescriptor.getName.toString
  lazy val dtgStartField        = sft.getUserData.getOrElse(SF_PROPERTY_START_TIME, SF_PROPERTY_START_TIME).asInstanceOf[String]
  lazy val dtgEndField          = sft.getUserData.getOrElse(SF_PROPERTY_END_TIME, SF_PROPERTY_END_TIME).asInstanceOf[String]
  lazy val encodedSFT           = DataUtilities.encodeType(sft)

  lazy val bounds = dataStore.getBounds(derivedQuery) match {
    case null => null
    case b =>
      val res = latLonGeoFactory.toGeometry(b)
      if(res.isInstanceOf[Point] || res.isInstanceOf[LineString]) res.buffer(0.01).asInstanceOf[Polygon]
      else res.asInstanceOf[Polygon]
  }

  val filterVisitor = new FilterToAccumulo(sft)
  val rewrittenCQL = filterVisitor.visit(query)
  val cqlString = ECQL.toCQL(rewrittenCQL)

  // run the query
  lazy val bs = dataStore.createBatchScanner

  lazy val spatial = filterVisitor.spatialPredicate
  lazy val temporal = filterVisitor.temporalPredicate
  lazy val underlyingIter = indexSchema.query(bs, spatial, temporal, encodedSFT, Some(cqlString), query.getHints.containsKey(DENSITY_KEY))

  lazy val iter =
    if(query.getHints.containsKey(DENSITY_KEY)) unpackDensityFeatures(underlyingIter)
    else underlyingIter.map { v => SimpleFeatureEncoder.decode(sft, v) }

  def unpackDensityFeatures(iter: Iterator[Value]) =
    iter.flatMap { i => DensityIterator.expandFeature(SimpleFeatureEncoder.decode(projectedSFT, i)) }

  override def getFeatureType = sft

  override def next() = iterValues.next()

  override def hasNext = iterValues.hasNext

  override def close() = bs.close()
}

object AccumuloFeatureReader {
  val DENSITY_KEY = new ClassKey(classOf[java.lang.Boolean])
  val WIDTH_KEY   = new IntegerKey(256)
  val HEIGHT_KEY  = new IntegerKey(256)
  val BBOX_KEY    = new ClassKey(classOf[ReferencedEnvelope])

  val latLonGeoFactory = new GeometryFactory(new PrecisionModel(PrecisionModel.FLOATING), 4326)
}
