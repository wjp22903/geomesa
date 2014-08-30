package org.locationtech.geomesa.core.filter

import java.util.Date

import com.typesafe.scalalogging.slf4j.Logging
import com.vividsolutions.jts.geom.Coordinate
import org.geotools.data.{Query, DataStoreFinder}
import org.geotools.data.simple.{SimpleFeatureSource, SimpleFeatureStore}
import org.geotools.factory.{CommonFactoryFinder, Hints}
import org.geotools.feature.DefaultFeatureCollection
import org.geotools.feature.simple.SimpleFeatureBuilder
import org.geotools.filter.text.ecql.ECQL
import org.geotools.geometry.jts.JTSFactoryFinder
import org.junit.runner.RunWith
import org.locationtech.geomesa.core.data.{AccumuloDataStore, AccumuloDataStoreTest, AccumuloFeatureStore}
import org.locationtech.geomesa.core.filter.TestFilters._
import org.locationtech.geomesa.core.iterators.TestData
import org.locationtech.geomesa.core.iterators.TestData._
import org.locationtech.geomesa.feature.AvroSimpleFeatureFactory
import org.locationtech.geomesa.utils.geotools.SimpleFeatureTypes
import org.opengis.feature.simple.{SimpleFeatureType, SimpleFeature}
import org.opengis.filter._
import org.specs2.mutable.Specification
import org.specs2.runner.JUnitRunner
import org.specs2.specification.Fragments

import scala.collection.JavaConversions._
import scala.collection.JavaConverters._


@RunWith(classOf[JUnitRunner])
class AllPredicateTest extends Specification with FilterTester {
  val filters = goodSpatialPredicates
  runTest
}

@RunWith(classOf[JUnitRunner])
class AndGeomsPredicateTest extends FilterTester {
  val filters = andedSpatialPredicates
  runTest
}

@RunWith(classOf[JUnitRunner])
class OrGeomsPredicateTest extends FilterTester {
  val filters = oredSpatialPredicates
  runTest
}

@RunWith(classOf[JUnitRunner])
class BasicTemporalPredicateTest extends FilterTester {
  val filters = temporalPredicates
  runTest
}

@RunWith(classOf[JUnitRunner])
class BasicSpatioTemporalPredicateTest extends FilterTester {
  val filters = spatioTemporalPredicates
  runTest
}

@RunWith(classOf[JUnitRunner])
class AttributePredicateTest extends FilterTester {
  val filters = attributePredicates
  runTest
}

@RunWith(classOf[JUnitRunner])
class AttributeGeoPredicateTest extends FilterTester {
  val filters = attributeAndGeometricPredicates
  runTest
}

@RunWith(classOf[JUnitRunner])
class IdQueryTest extends Specification {

  val ff = CommonFactoryFinder.getFilterFactory2
  val ds = {
    DataStoreFinder.getDataStore(Map(
      "instanceId"        -> "mycloud",
      "zookeepers"        -> "zoo1:2181,zoo2:2181,zoo3:2181",
      "user"              -> "myuser",
      "password"          -> "mypassword",
      "auths"             -> "A,B,C",
      "tableName"         -> "idquerytest",
      "useMock"           -> "true",
      "featureEncoding"   -> "avro")).asInstanceOf[AccumuloDataStore]
  }
  val geomBuilder = JTSFactoryFinder.getGeometryFactory
  val sft = SimpleFeatureTypes.createType("idquerysft", "age:Int:index=true,name:String:index=true,dtg:Date,*geom:Point:srid=4326")
  ds.createSchema(sft)
  val builder = new SimpleFeatureBuilder(sft, new AvroSimpleFeatureFactory)
  val data = List(
    ("1", Array(10, "johndoe", new Date), geomBuilder.createPoint(new Coordinate(10, 10))),
    ("2", Array(20, "janedoe", new Date), geomBuilder.createPoint(new Coordinate(20, 20))),
    ("3", Array(30, "johnrdoe", new Date), geomBuilder.createPoint(new Coordinate(20, 20)))
  )
  val featureCollection = new DefaultFeatureCollection()
  val features = data.foreach { case (id, attrs, geom) =>
    builder.reset()
    builder.addAll(attrs.asInstanceOf[Array[AnyRef]])
    val f = builder.buildFeature(id)
    f.setDefaultGeometry(geom)
    f.getUserData.put(Hints.USE_PROVIDED_FID, java.lang.Boolean.TRUE)
    featureCollection.add(f)
  }
  val fs = ds.getFeatureSource("idquerysft").asInstanceOf[SimpleFeatureStore]
  fs.addFeatures(featureCollection)
  fs.flush()

  import org.locationtech.geomesa.utils.geotools.Conversions._

  "Id queries" should {

    "use record table to return a result" >> {
      val idQ = ff.id(ff.featureId("2"))
      val res = fs.getFeatures(idQ).features().toList
      res.length mustEqual 1
      res.head.getID mustEqual "2"
    }

    "handle multiple ids correctly" >> {
      val idQ = ff.id(ff.featureId("1"), ff.featureId("3"))
      val res = fs.getFeatures(idQ).features().toList
      res.length mustEqual 2
      res.map(_.getID) must contain ("1", "3")
    }
  }
}

object FilterTester extends AccumuloDataStoreTest with Logging {
  val mediumDataFeatures: Seq[SimpleFeature] = mediumData.map(createSF)
  val sft = mediumDataFeatures.head.getFeatureType

  val sft2 = TestData.getFeatureType(TestData.featureName + "2")
  val mediumDataFeatures2: Seq[SimpleFeature] = mediumData.map(createSF(_, sft2))

  val ds = {
    DataStoreFinder.getDataStore(Map(
      "instanceId"        -> "mycloud",
      "zookeepers"        -> "zoo1:2181,zoo2:2181,zoo3:2181",
      "user"              -> "myuser",
      "password"          -> "mypassword",
      "auths"             -> "A,B,C",
      "tableName"         -> "filtertester",
      "useMock"           -> "true",
      "featureEncoding"   -> "avro")).asInstanceOf[AccumuloDataStore]
  }

  val fs1 = buildFeatureSource(sft, mediumDataFeatures)
  val fs2 = buildFeatureSource(sft2, mediumDataFeatures2)

  val attrTable = ds.getAttrIdxTableName(sft)

  val scanner = ds.createAttrIdxScanner(sft)


  val afr = ds.getFeatureReader(sft.getTypeName)

  def getFeatureStore = {
    val names = ds.getNames

    if(!names.contains(sft.getTypeName)) {
      buildFeatureSource(sft, mediumDataFeatures)
    } else {
      ds.getFeatureSource(sft.getTypeName)
    }
  }

  def buildFeatureSource(featureType: SimpleFeatureType, features: Seq[SimpleFeature]): SimpleFeatureSource = {
    ds.createSchema(featureType)
    val fs: AccumuloFeatureStore = ds.getFeatureSource(featureType.getTypeName).asInstanceOf[AccumuloFeatureStore]
    val coll = new DefaultFeatureCollection(featureType.getTypeName)
    coll.addAll(features.asJavaCollection)

    logger.debug(s"Adding SimpleFeatures of type ${coll.getSchema.getTypeName} to feature store.")
    fs.addFeatures(coll)
    logger.debug("Done adding SimpleFeaturest to feature store.")

    fs
  }

}


trait FilterTester extends Specification with Logging {
  import org.locationtech.geomesa.core.filter.FilterTester._
  val fs = fs1

  def filters: Seq[String]

  def compareFilter(filter: Filter): Fragments = {
    logger.debug(s"Filter: ${ECQL.toCQL(filter)}")

    s"The filter $filter" should {
      "return the same number of results from filtering and querying" in {
        val filterCount = mediumDataFeatures.count(filter.evaluate)
        val queryCount = fs.getFeatures(filter).size
        
        logger.debug(s"\nFilter: ${ECQL.toCQL(filter)}\nFullData size: ${mediumDataFeatures.size}: " +
          s"filter hits: $filterCount query hits: $queryCount")
        filterCount mustEqual queryCount
      }
    }
  }
  val q = new Query(sft.getTypeName)

  import org.locationtech.geomesa.core.filter.FilterUtils._
  def runTest = filters.map {s => q.setFilter(s); afr.explainQuery(q); compareFilter(s) }
}
