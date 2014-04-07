package geomesa.core.data

import org.junit.runner.RunWith
import org.specs2.runner.JUnitRunner
import org.specs2.mutable.Specification
import org.geotools.factory.CommonFactoryFinder
import org.geotools.geometry.jts.{ReferencedEnvelope, JTSFactoryFinder}
import org.geotools.referencing.crs.DefaultGeographicCRS
import org.geotools.referencing.CRS
import org.geotools.data.DataUtilities
import org.opengis.filter.Filter
import geomesa.core.index.Constants
import geomesa.utils.text.WKTUtils
import com.vividsolutions.jts.geom.Coordinate
import org.opengis.filter.spatial.DWithin
import org.geotools.filter.spatial.DWithinImpl

@RunWith(classOf[JUnitRunner])
class FilterToAccumulo2Test extends Specification {

  val WGS84       = DefaultGeographicCRS.WGS84
  val ff          = CommonFactoryFinder.getFilterFactory2
  val geomFactory = JTSFactoryFinder.getGeometryFactory
  val sft         = DataUtilities.createType("test", "id:Integer,prop:String,dtg:Date,otherGeom:Geometry:srid=4326,*geom:Point:srid=4326")
  sft.getUserData.put(Constants.SF_PROPERTY_START_TIME, "dtg")

  "BBOX queries" should {
    "set the spatial predicate and simplify the query" in {
      val q = ff.bbox("geom", -80.0, 30, -70, 40, CRS.toSRS(WGS84))
      val f2a = new FilterToAccumulo2(sft)
      val result = f2a.visit(q)
      result mustEqual Filter.INCLUDE
    }

    "set the spatial predicate and remove from the subsequent query" in {
      val q =
        ff.and(
          ff.like(ff.property("prop"), "foo"),
          ff.bbox("geom", -80.0, 30, -70, 40, CRS.toSRS(WGS84))
        )
      val f2a = new FilterToAccumulo2(sft)
      val result = f2a.visit(q)
      result mustEqual ff.like(ff.property("prop"), "foo")
    }
  }

  "DWithin queries" should {
    val targetPoint = geomFactory.createPoint(new Coordinate(-70, 30))

    "take in meters" in {
      val q =
        ff.dwithin(ff.property("geom"), ff.literal(targetPoint), 100.0, "meters")

      val f2a = new FilterToAccumulo2(sft)
      val result = f2a.visit(q)
      val env = new ReferencedEnvelope(-70.00090210016619, - 69.99909789983381, 29.99909789983381, 30.00090210016619, WGS84)
      val resultEnv = f2a.spatialPredicate.asInstanceOf[ReferencedEnvelope]
      env.getLowerCorner.getCoordinate mustEqual resultEnv.getLowerCorner.getCoordinate
      env.getUpperCorner.getCoordinate mustEqual resultEnv.getUpperCorner.getCoordinate
      result.asInstanceOf[DWithin].getDistance mustEqual 9.021001661899675E-4
    }
  }

  "Within queries" should {
    "set the spatial predicate and simplify the query if rectangular" in {
      val rectWithin =
        ff.within(
          ff.property("geom"),
          ff.literal(WKTUtils.read("POLYGON((-80 30,-70 30,-70 40,-80 40,-80 30))")))
      val f2a = new FilterToAccumulo2(sft)
      val result = f2a.visit(rectWithin)
      result mustEqual Filter.INCLUDE
    }

    "set the spatial predicate and keep the geom query if not rectangular" in {
      val rectWithin =
        ff.within(
          ff.property("geom"),
          ff.literal(WKTUtils.read("POLYGON((-80 30,-80 23,-70 30,-70 40,-80 40,-80 30))")))
      val f2a = new FilterToAccumulo2(sft)
      val result = f2a.visit(rectWithin)
      result mustNotEqual Filter.INCLUDE
    }
  }

}
