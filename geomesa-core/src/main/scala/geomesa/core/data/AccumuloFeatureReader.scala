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
import org.geotools.data.{Query, FeatureReader}
import org.geotools.factory.CommonFactoryFinder
import org.geotools.filter.text.ecql.ECQL
import org.geotools.geometry.jts.JTS
import org.opengis.feature.simple.{SimpleFeature, SimpleFeatureType}

class AccumuloFeatureReader(dataStore: AccumuloDataStore,
                            featureName: String,
                            query: Query,
                            indexSchemaFmt: String,
                            attributes: String,
                            sft: SimpleFeatureType)
  extends FeatureReader[SimpleFeatureType, SimpleFeature] {

  import AccumuloFeatureReader._
  import collection.JavaConversions._

  lazy val ff = CommonFactoryFinder.getFilterFactory2
  lazy val indexSchema = SpatioTemporalIndexSchema(indexSchemaFmt, sft)
  lazy val geometryPropertyName = sft.getGeometryDescriptor.getName.toString
  lazy val dtgStartField        = sft.getUserData.getOrElse(SF_PROPERTY_START_TIME, SF_PROPERTY_START_TIME).asInstanceOf[String]
  lazy val dtgEndField          = sft.getUserData.getOrElse(SF_PROPERTY_END_TIME, SF_PROPERTY_END_TIME).asInstanceOf[String]

  lazy val bounds = dataStore.getBounds(query) match {
    case null => null
    case b =>
      val res = latLonGeoFactory.toGeometry(b)
      if(res.isInstanceOf[Point] || res.isInstanceOf[LineString]) res.buffer(0.01).asInstanceOf[Polygon]
      else res.asInstanceOf[Polygon]
  }

  val filterVisitor = new FilterToAccumulo2(null)
  //query.getFilter.accept(filterVisitor, null)

  // run the query
  lazy val bs = dataStore.createBatchScanner

  lazy val iterValues = indexSchema.query(bs,null, null, null)
    //filterVisitor.spatialPredicate,
    //filterVisitor.temporalPredicate, attributes, null)
//      Some(ECQL.toCQL(ff.and(filterVisitor.dwithinCQL, query.getFilter))))

  override def getFeatureType = sft

  override def next() = SimpleFeatureEncoder.decode(getFeatureType, iterValues.next())

  override def hasNext = iterValues.hasNext

  override def close() = bs.close()
}

object AccumuloFeatureReader {
  val latLonGeoFactory = new GeometryFactory(new PrecisionModel(PrecisionModel.FLOATING), 4326)
}