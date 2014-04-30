package geomesa.core.minimesa

import java.io.File
import org.apache.accumulo._
import org.apache.accumulo.core._
import org.apache.accumulo.minicluster._
import org.apache.accumulo.start._
import org.junit._
import org.junit.runner.RunWith
import org.specs2.runner.JUnitRunner
import org.specs2.mutable.Specification
import geomesa.utils.geotools.GeneralShapefileIngest
import java.util.{Map => JMap}
import scala.collection.JavaConversions._
import org.geotools.data.DataStoreFinder
import java.net.URL


@RunWith(classOf[JUnitRunner])
class MiniMesaTest extends Specification {

  //
  //  val folder = new TemporaryFolder(new File("/tmp/"))

  "MiniAccumulo" should {

    "Not be null" in {
      val tmp = new File(s"/tmp/${scala.util.Random.alphanumeric.take(5).mkString}")

      System.out.println(s"Tmp  dir: $tmp")

      val passwd = "secret"
      val ma = new MiniAccumuloCluster(tmp, passwd)

      ma.start()

      System.out.println("Started MiniAccumulo")

      val zk: String = ma.getZooKeepers

      val r: URL = getClass.getResource("/shpfiles/af_villages_u.shp")

      System.out.println(s"Path is ${r.getPath}")

      //val villages = "/opt/devel/src/SPINOZA-RPMS/spinoza-geo-data/target/af/spinoza_map_data/features/af_villages_u.shp"

      val maparams = Map("instanceId" -> "miniInstance", "zookeepers" -> zk, "user" -> "root",
        "password" -> new String(passwd), "auths" -> "", "tableName" -> "matest")

      System.out.println("Ingesting Shapefile")

      GeneralShapefileIngest.shpToDataStoreViaParams(r.getPath, maparams)

      System.out.println("Ingested shapefile")

      val ds = DataStoreFinder.getDataStore(maparams)
      val fs = ds.getFeatureSource(ds.getNames.head)
      val size = fs.getFeatures().size

      System.out.println(s" Size of collection is $size.")

      ma.stop()

    }

  }
}
