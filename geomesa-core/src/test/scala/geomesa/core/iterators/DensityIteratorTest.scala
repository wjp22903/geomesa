package geomesa.core.iterators

import collection.JavaConversions._
import geomesa.core.data.{AccumuloFeatureReader, AccumuloDataStoreFactory}
import geomesa.core.index.Constants
import org.apache.accumulo.core.client.mock.MockInstance
import org.apache.accumulo.core.client.security.tokens.PasswordToken
import org.geotools.data.simple.SimpleFeatureStore
import org.geotools.data.{Query, DataUtilities}
import org.geotools.filter.text.ecql.ECQL
import org.junit.runner.RunWith
import org.specs2.mutable.Specification
import org.specs2.runner.JUnitRunner
import org.geotools.feature.simple.SimpleFeatureBuilder
import org.joda.time.DateTime
import org.geotools.factory.Hints

@RunWith(classOf[JUnitRunner])
class DensityIteratorTest extends Specification {

  val mockInstance = new MockInstance("dummy")
  val c = mockInstance.getConnector("user", new PasswordToken("pass".getBytes()))
  c.tableOperations.create("test")

  val dsf = new AccumuloDataStoreFactory

  import AccumuloDataStoreFactory.params._

  val ds = dsf.createDataStore(
    Map(
      zookeepersParam.key -> "dummy",
      instanceIdParam.key -> "dummy",
      userParam.key       -> "user",
      passwordParam.key   -> "pass",
      authsParam.key      -> "S,USA",
      tableNameParam.key  -> "test",
      mockParam.key       -> "true"
    ))


  val spec = "id:java.lang.Integer,attr:java.lang.Double,dtg:Date,geom:Point:srid=4326"
  val sft = DataUtilities.createType("test", spec)
  sft.getUserData.put(Constants.SF_PROPERTY_START_TIME, "dtg")

  ds.createSchema(sft)

  val encodedFeatures = Array(
    Array("1", "1.0", new DateTime("2012-01-01T00:00:00").toDate, "POINT(-77 38)"),
    Array("2", "1.0", new DateTime("2012-01-01T01:00:00").toDate, "POINT(-77 38)"),
    Array("3", "1.0", new DateTime("2012-01-01T02:00:00").toDate, "POINT(-77 38)"),
    Array("4", "1.0", new DateTime("2012-01-01T03:00:00").toDate, "POINT(-77 38)")
  )

  val builder = new SimpleFeatureBuilder(sft)
  val features = encodedFeatures.map { e =>
    val f = builder.buildFeature(e(0).toString, e.asInstanceOf[Array[AnyRef]])
    f.getUserData.put(Hints.USE_PROVIDED_FID, java.lang.Boolean.TRUE)
    f.getUserData.put(Hints.PROVIDED_FID, e(0).toString)
    f
  }

  val fs = ds.getFeatureSource("test").asInstanceOf[SimpleFeatureStore]
  fs.addFeatures(DataUtilities.collection(features))
  fs.getTransaction.commit()

  val q = new Query("test", ECQL.toFilter("(dtg between '2011-12-29T00:00:00.000Z' AND '2012-01-03T00:00:00.000Z') and BBOX(geom, -80, 33, -70, 40)") )
  q.getHints.put(AccumuloFeatureReader.DENSITY_KEY, java.lang.Boolean.TRUE)
  val results = fs.getFeatures(q)

  results.features().next()

}
