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

package org.locationtech.geomesa.core.iterators

import java.text.SimpleDateFormat
import java.util.TimeZone

import com.vividsolutions.jts.geom.Geometry
import org.apache.accumulo.core.client.admin.TimeType
import org.apache.accumulo.core.client.mock.MockInstance
import org.apache.accumulo.core.client.security.tokens.PasswordToken
import org.apache.accumulo.core.client.{BatchWriterConfig, IteratorSetting}
import org.apache.accumulo.core.data.{Range => ARange}
import org.apache.accumulo.core.security.{Authorizations, ColumnVisibility}
import org.geotools.data.{DataStoreFinder, Query}
import org.geotools.factory.{CommonFactoryFinder, Hints}
import org.geotools.feature.DefaultFeatureCollection
import org.geotools.feature.simple.SimpleFeatureBuilder
import org.geotools.filter.text.ecql.ECQL
import org.joda.time.{DateTime, DateTimeZone}
import org.junit.runner.RunWith
import org.locationtech.geomesa.core.data._
import org.locationtech.geomesa.core.data.tables.AttributeTable
import org.locationtech.geomesa.utils.geotools.Conversions._
import org.locationtech.geomesa.utils.geotools.SimpleFeatureTypes
import org.locationtech.geomesa.utils.text.WKTUtils
import org.specs2.mutable.Specification
import org.specs2.runner.JUnitRunner

import scala.collection.JavaConversions._

@RunWith(classOf[JUnitRunner])
class AttributeIndexFilteringIteratorTest extends Specification {

  val sftName = "AttributeIndexFilteringIteratorTest"
  val sft = SimpleFeatureTypes.createType(sftName, s"name:String,age:Integer,dtg:Date,*geom:Geometry:srid=4326")

  val sdf = new SimpleDateFormat("yyyyMMdd")
  sdf.setTimeZone(TimeZone.getTimeZone("Zulu"))
  val dateToIndex = sdf.parse("20140102")

  def createStore: AccumuloDataStore =
  // the specific parameter values should not matter, as we
  // are requesting a mock data store connection to Accumulo
    DataStoreFinder.getDataStore(Map(
      "instanceId"        -> "mycloud",
      "zookeepers"        -> "zoo1:2181,zoo2:2181,zoo3:2181",
      "user"              -> "myuser",
      "password"          -> "mypassword",
      "auths"             -> "A,B,C",
      "tableName"         -> "AttributeIndexFilteringIteratorTest",
      "useMock"           -> "true")).asInstanceOf[AccumuloDataStore]

  val ds = createStore

  ds.createSchema(sft)
  val fs = ds.getFeatureSource(sftName).asInstanceOf[AccumuloFeatureStore]

  val featureCollection = new DefaultFeatureCollection(sftName, sft)

  List("a", "b", "c", "d").foreach { name =>
    List(1, 2, 3, 4).zip(List(45, 46, 47, 48)).foreach { case (i, lat) =>
      val sf = SimpleFeatureBuilder.build(sft, List(), name + i.toString)
      sf.setDefaultGeometry(WKTUtils.read(f"POINT($lat%d $lat%d)"))
      sf.setAttribute("dtg", new DateTime("2011-01-01T00:00:00Z", DateTimeZone.UTC).toDate)
      sf.setAttribute("name", name)
      sf.getUserData()(Hints.USE_PROVIDED_FID) = java.lang.Boolean.TRUE
      featureCollection.add(sf)
    }
  }

  fs.addFeatures(featureCollection)

  val ff = CommonFactoryFinder.getFilterFactory2

  "AttributeIndexFilteringIterator" should {

    "implement the Accumulo iterator stack properly" in {
      val table = "AttributeIndexFilteringIteratorTest_2"
      val instance = new MockInstance(table)
      val conn = instance.getConnector("", new PasswordToken(""))
      conn.tableOperations.create(table, true, TimeType.LOGICAL)

      val bw = conn.createBatchWriter(table, new BatchWriterConfig)
      featureCollection.foreach { feature =>
        val muts = AttributeTable.getAttributeIndexMutations(feature,
                                                                  sft.getAttributeDescriptors,
                                                                  new ColumnVisibility())
        bw.addMutations(muts)
      }
      bw.close()

      // Scan and retrive type = b manually with the iterator
      val scanner = conn.createScanner(table, new Authorizations())
      val is = new IteratorSetting(40, classOf[AttributeIndexFilteringIterator])
      scanner.addScanIterator(is)
      scanner.setRange(new ARange(AttributeTable.getAttributeIndexRow("name", Some("b"))))
      scanner.iterator.size mustEqual 4
    }

    "handle like queries" in {
      // Try out wildcard queries using the % wildcard syntax.
      // Test single wildcard, trailing, leading, and both trailing & leading wildcards

      // % should return all features
      fs.getFeatures(ff.like(ff.property("name"),"%")).features.size mustEqual 16

      forall(List("a", "b", "c", "d")) { letter =>
        // 4 features for this letter
        fs.getFeatures(ff.like(ff.property("name"),s"%$letter")).features.size mustEqual 4

        // should return the 4 features for this letter
        fs.getFeatures(ff.like(ff.property("name"),s"%$letter%")).features.size mustEqual 4

        // should return the 4 features for this letter
        fs.getFeatures(ff.like(ff.property("name"),s"$letter%")).features.size mustEqual 4
      }

    }

    "handle transforms" in {
      // transform to only return the attribute geom - dropping dtg and name
      forall(List("a", "b", "c", "d")) { letter =>
        val query = new Query(sftName, ECQL.toFilter(s"name <> '$letter'"), Array("geom"))
        val features = fs.getFeatures(query)

        features.size mustEqual 12
        forall(features.features) { sf =>
          sf.getAttribute(0) must beAnInstanceOf[Geometry]
        }

        forall(features.features) { sf =>
          sf.getAttributeCount mustEqual 1
        }
      }
    }
  }

}
