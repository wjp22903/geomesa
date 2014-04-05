package geomesa.core.data

import com.vividsolutions.jts.geom.{Point, Polygon, Geometry, Envelope}
import org.joda.time.Interval
import org.joda.time.format.ISODateTimeFormat
import org.opengis.filter._
import org.opengis.filter.expression._
import org.opengis.filter.spatial._
import org.opengis.filter.temporal._
import org.opengis.temporal.Period
import org.geotools.factory.CommonFactoryFinder
import org.geotools.referencing.GeodeticCalculator
import org.geotools.geometry.jts.{JTSFactoryFinder, JTS}

class FilterToAccumulo2(geoProperty: String,
                        dtgProperty: String) extends FilterVisitor with ExpressionVisitor {

  var period: Interval = new Interval(0, Long.MaxValue)
  var bbox: Envelope   = new Envelope(-180, -90, 180, 90)
  var dwithinCQL: Filter = Filter.INCLUDE

  val ff = CommonFactoryFinder.getFilterFactory2
  val geoFactory = JTSFactoryFinder.getGeometryFactory


  private def visitBinarySpatialOperator(op: BinarySpatialOperator, extra: AnyRef): AnyRef = {
    val e1 = op.getExpression1.evaluate(null).asInstanceOf[PropertyName]
    if(e1.getPropertyName == geoProperty) {
      val e2 = op.getExpression2.evaluate(null).asInstanceOf[Geometry]
      bbox = e2.getEnvelopeInternal
    }
    extra
  }
  
  override def visit(contains: TOverlaps, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(equals: TEquals, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(contains: TContains, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(overlappedBy: OverlappedBy, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(metBy: MetBy, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(meets: Meets, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(ends: Ends, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(endedBy: EndedBy, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(filter: During, extraData: scala.AnyRef): AnyRef = {
    val e1 = filter.getExpression1.asInstanceOf[PropertyName]
    val e2 = filter.getExpression2.asInstanceOf[Literal]
    val ogcperiod = e2.evaluate(null).asInstanceOf[Period]
    if(e1.getPropertyName == dtgProperty) {
      val s = ogcperiod.getBeginning.getPosition.getDate.getTime
      val e = ogcperiod.getEnding.getPosition.getDate.getTime
      period = new Interval(s, e)
    }
    extraData
  }

  override def visit(begunBy: BegunBy, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(begins: Begins, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(before: Before, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(anyInteracts: AnyInteracts, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(after: After, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(filter: Within, extraData: scala.AnyRef): AnyRef =
    visitBinarySpatialOperator(filter, extraData)

  override def visit(filter: Touches, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(filter: Overlaps, extraData: scala.AnyRef): AnyRef =
    visitBinarySpatialOperator(filter, extraData)

  override def visit(filter: Intersects, extraData: scala.AnyRef): AnyRef =
    visitBinarySpatialOperator(filter, extraData)

  override def visit(filter: Equals, extraData: scala.AnyRef): AnyRef = extraData

  implicit def bufferedPoint2Poly(point: Point, distance: Double): Polygon = {
    val geoCalc = new GeodeticCalculator()

    // Distance must be in meters
    geoCalc.setStartingGeographicPoint(point.getX, point.getY)
    geoCalc.setDirection(0, distance)
    val top = geoCalc.getDestinationGeographicPoint
    geoCalc.setDirection(180, distance)
    val bottom = geoCalc.getDestinationGeographicPoint

    geoCalc.setStartingGeographicPoint(top)
    geoCalc.setDirection(90, distance)
    val topRight = geoCalc.getDestinationGeographicPoint
    geoCalc.setDirection(-90, distance)
    val topLeft = geoCalc.getDestinationGeographicPoint

    geoCalc.setStartingGeographicPoint(bottom)
    geoCalc.setDirection(90, distance)
    val bottomRight = geoCalc.getDestinationGeographicPoint
    geoCalc.setDirection(-90, distance)
    val bottomLeft = geoCalc.getDestinationGeographicPoint

    val env = new Envelope(point.getCoordinate)
    env.expandToInclude(topRight.getX, topRight.getY)
    env.expandToInclude(topLeft.getX, topLeft.getY)
    env.expandToInclude(bottomRight.getX, bottomRight.getY)
    env.expandToInclude(bottomLeft.getX, bottomLeft.getY)
    JTS.toGeometry(env)
  }

  def getBufferedGeometry(expression: Expression, distance: Double, units: String): Polygon =
    expression.evaluate(null) match {
      case point: Point      => bufferedPoint2Poly(point, distance)
      case _                 => JTS.toGeometry(new Envelope(-180, 180, -90, 90))
    }

  override def visit(dwithin: DWithin, extraData: scala.AnyRef): AnyRef = {
    val e1 = dwithin.getExpression1
    val e2 = dwithin.getExpression2
    dwithinCQL = ff.dwithin(e1, e2, dwithin.getDistance / 111120.0, "")
    val geom = getBufferedGeometry(e2, dwithin.getDistance, dwithin.getDistanceUnits)
    bbox = geom.getEnvelopeInternal
    extraData
  }

  override def visit(filter: Disjoint, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(filter: Crosses, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(filter: Contains, extraData: scala.AnyRef): AnyRef =
    visitBinarySpatialOperator(filter, extraData)

  override def visit(filter: Beyond, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(filter: BBOX, extraData: scala.AnyRef): AnyRef =
    visitBinarySpatialOperator(filter, extraData)

  override def visit(filter: PropertyIsNil, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(filter: PropertyIsNull, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(filter: PropertyIsLike, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(filter: PropertyIsLessThanOrEqualTo, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(filter: PropertyIsLessThan, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(filter: PropertyIsGreaterThanOrEqualTo, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(filter: PropertyIsGreaterThan, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(filter: PropertyIsNotEqualTo, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(filter: PropertyIsEqualTo, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(filter: PropertyIsBetween, extraData: scala.AnyRef): AnyRef = {
    filter.getExpression match {
      case pn: PropertyName if pn.getPropertyName == dtgProperty =>
        val sexp = filter.getLowerBoundary.evaluate(null)
        val eexp = filter.getUpperBoundary.evaluate(null)
        val s = ISODateTimeFormat.dateTime().parseDateTime(sexp.toString)
        val e = ISODateTimeFormat.dateTime().parseDateTime(eexp.toString)
        period = new Interval(s, e)
    }
    extraData
  }

  import collection.JavaConversions._

  override def visit(filter: Or, extraData: scala.AnyRef): AnyRef = {
    filter.getChildren().foreach(_.accept(this, extraData))
    extraData
  }

  override def visit(filter: Not, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(filter: Id, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(filter: And, extraData: scala.AnyRef): AnyRef = {
    filter.getChildren().foreach(_.accept(this, extraData))
    extraData
  }

  override def visit(filter: IncludeFilter, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(filter: ExcludeFilter, extraData: scala.AnyRef): AnyRef = extraData

  override def visitNullFilter(extraData: scala.AnyRef): AnyRef = extraData

  override def visit(expression: Subtract, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(expression: PropertyName, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(expression: Multiply, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(expression: Literal, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(expression: Function, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(expression: Divide, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(expression: Add, extraData: scala.AnyRef): AnyRef = extraData

  override def visit(expression: NilExpression, extraData: scala.AnyRef): AnyRef = extraData
}
