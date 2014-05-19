package geomesa.core.data

import FilterTest._
import geomesa.core.filter.OrSplittingFilterTest._
import geomesa.core.index.IndexSchema
import geomesa.core.iterators.SpatioTemporalIntersectingIteratorTest._
import geomesa.core.iterators.TestData
import geomesa.core.iterators.TestData._
import org.apache.accumulo.core.client.{BatchScanner, Connector}
import org.geotools.data.Query
import org.joda.time._
import org.junit.runner.RunWith
import org.opengis.feature.simple.SimpleFeature
import org.opengis.filter.Filter
import org.specs2.mutable.Specification
import org.specs2.runner.JUnitRunner

object FilterTest {

  def dt(i: Interval): Option[String] =
    Option(i) map {int => s"(geomesa_index_start_time between '${int.getStart}' AND '${int.getEnd}')"
    }

  def red(f: String, og: Option[String]) = og match {
    case Some(g) => s"$f AND $g"
    case None => f
  }

  val predicates = List("INTERSECTS")
  val tails = List("(geomesa_index_geometry, POLYGON ((45 23, 48 23, 48 27, 45 27, 45 23)))")

  val dtFilter: Interval = IndexSchema.everywhen
  val int2 = new Interval(new DateTime("2010-07-01T00:00:00.000Z"), new DateTime("2010-07-31T00:00:00.000Z"))

  val ints: List[Interval] = List(dtFilter, int2, null)

  val basicFilters: List[String] = for {
    p <- predicates
    t <- tails
    i <- ints
  } yield red(s"$p$t", dt(i))

  val geoms = List("(geomesa_index_geometry, POLYGON ((45 23, 48 23, 48 27, 45 27, 45 23)))",
    "(geomesa_index_geometry, POLYGON ((41 28, 42 28, 42 29, 41 29, 41 28)))",
    "(geomesa_index_geometry, POLYGON ((44 23, 46 23, 46 25, 44 25, 44 23)))")

  val moreGeomFilters = for {
    p <- predicates
    g <- geoms
  } yield s"$p$g"

  val oneAndGeoms = for {
    p1 <- predicates
    p2 <- predicates
    g1 <- geoms
    g2 <- geoms if g2 != g1
  } yield s"$p1$g1 AND $p2$g2"

  val oneOrGeoms = for {
    p1 <- predicates
    p2 <- predicates
    g1 <- geoms
    g2 <- geoms if g2 != g1
  } yield s"$p1$g1 OR $p2$g2"

  val filters: List[String] = basicFilters ++ oneOrGeoms :+ "INCLUDE"
}


@RunWith(classOf[JUnitRunner])
class FilterTest extends Specification {
  val mixedDataFeatures = mixedData.map(createSF)
  val mixedDataConnector = TestData.setupMockAccumuloTable(mixedData, "mixedData")

  filters.map{ fs => s"Filter $fs should work the same" should {
    "in Mock GeoMesa and directly for the mixedDataFeatures" in {
      compare(fs, mixedDataFeatures, "mixedData", mixedDataConnector)
      }
    }
  }

  def compare(filter: Filter, features: List[SimpleFeature], target: String, conn: Connector) = {
    val bs: () => BatchScanner = () => conn.createBatchScanner(target, TEST_AUTHORIZATIONS, 5)

    val q = new Query(TestData.featureType.getTypeName, filter)

    val filteredNumber: Int = features.count(filter.evaluate)
    val start = System.currentTimeMillis()
    val mockNumber: Int = runQuery(q, bs, false)
    val end = System.currentTimeMillis()
    println(s"Query $filter took ${(end-start)/1000.0} seconds")

    if(filteredNumber != mockNumber)
      println(s"Filter against $target: $filter filtered: $filteredNumber mockNumber: $mockNumber")

    filteredNumber mustEqual mockNumber
  }
}
