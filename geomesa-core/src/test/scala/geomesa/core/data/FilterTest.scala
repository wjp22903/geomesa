package geomesa.core.data

import geomesa.core.iterators.{TestData, SpatioTemporalIntersectingIteratorTest}
import geomesa.core.iterators.TestData._
import org.geotools.filter.text.ecql.ECQL
import org.junit.runner.RunWith
import org.specs2.mutable.Specification
import org.specs2.runner.JUnitRunner
import org.geotools.data.Query

@RunWith(classOf[JUnitRunner])
class FilterTest extends Specification {

  val allFeatures = fullData.map(createSF)
  val stiit = new SpatioTemporalIntersectingIteratorTest

  val connector = TestData.setupMockAccumuloTable(fullData, 0)

  val predicates = List("INTERSECTS", "DISJOINT", "CONTAINS", "TOUCHES", "CROSSES", "EQUALS")

  // These predicates are *not* working presently.
  val failingPredicates = List("OVERLAPS", "WITHIN")

  val tails = List("(geomesa_index_geometry, POLYGON ((45 23, 48 23, 48 27, 45 27, 45 23)))",
                     "(geomesa_index_geometry, POLYGON ((45 23, 48 23, 48 27, 45 27, 45 23))) AND (attr2 like '2nd___')")

  val basicFilters = for {
    p <- predicates
    t <- tails
  } yield s"$p$t"


  // RELATE, DWITHIN, BEYOND, BBOX

  basicFilters.map{ fs => s"Filter $fs should work the same" should {
    "in Mock GeoMesa and directly " in {
        compare(fs)
      }
    }
  }

  def compare(fs: String) = {
    val bs = connector.createBatchScanner(TEST_TABLE, TEST_AUTHORIZATIONS, 5)
    val filter = ECQL.toFilter(fs)

    val q = new Query(TestData.featureType.getTypeName, filter)

    val filteredNumber: Int = allFeatures.count(filter.evaluate)
    val mockNumber: Int = stiit.runQuery(q, bs, false)

    println(s"Filter: $fs filtered: $filteredNumber mockNumber: $mockNumber")
    filteredNumber mustEqual mockNumber
  }


//  "INTERSECTS should work the same" should {
//    "in AD and directly" in {
//
//      val fs = "INTERSECTS(geomesa_index_geometry, POLYGON ((45 23, 48 23, 48 27, 45 27, 45 23))) AND (attr2 like '2nd___')"
//      val filter = ECQL.toFilter(fs)
//
//      val filteredNumber: Int = allFeatures.count(filter.evaluate)
//
//      val mockNumber: Int = stiit.runMockAccumuloTest("mock-attr-filt", fullData, Some(fs), 113)
//
//      filteredNumber mustEqual mockNumber
//    }
//  }
//
//  "CONTAINS should work the same" should {
//    "in AD and directly" in {
//
//      val fs = "CONTAINS(geomesa_index_geometry, POLYGON ((45 23, 48 23, 48 27, 45 27, 45 23))) AND (attr2 like '2nd___')"
//      val filter = ECQL.toFilter(fs)
//
//      val filteredNumber: Int = allFeatures.count(filter.evaluate)
//
//      val mockNumber: Int = stiit.runMockAccumuloTest("mock-attr-filt", fullData, Some(fs), 113)
//
//      filteredNumber mustEqual mockNumber
//    }
//  }
//
//  "WITHIN should work the same" should {
//    "in AD and directly" in {
//
//      val fs = "WITHIN(geomesa_index_geometry, POLYGON ((45 23, 48 23, 48 27, 45 27, 45 23))) AND (attr2 like '2nd___')"
//      val filter = ECQL.toFilter(fs)
//
//      val filteredNumber: Int = allFeatures.count(filter.evaluate)
//
//      val mockNumber: Int = stiit.runMockAccumuloTest("mock-attr-filt", fullData, Some(fs), 113)
//
//      filteredNumber mustEqual mockNumber
//    }
//  }


}
