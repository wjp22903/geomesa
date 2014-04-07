package geomesa.core.data

import com.vividsolutions.jts.geom.{Point, Geometry, Polygon, Envelope}
import org.joda.time.Interval
import org.opengis.filter._
import org.opengis.filter.expression._
import org.opengis.filter.spatial._
import org.opengis.filter.temporal._
import org.geotools.factory.CommonFactoryFinder
import org.geotools.geometry.jts.{JTSFactoryFinder, JTS}
import collection.JavaConversions._
import org.opengis.feature.simple.SimpleFeatureType
import geomesa.core.index
import org.opengis.feature.`type`.AttributeDescriptor
import org.opengis.geometry.BoundingBox
import org.geotools.filter.visitor.SimplifyingFilterVisitor
import org.geotools.referencing.GeodeticCalculator
import org.geotools.referencing.crs.DefaultGeographicCRS
import org.geotools.geometry.DirectPosition2D

// FilterToAccumulo2 extracts the spatial and temporal predicates from the
// filter while rewriting the filter to optimize for scanning Accumulo
class FilterToAccumulo2(sft: SimpleFeatureType) {

  val dtgField  = index.getDtgDescriptor(sft)
  val geomField = sft.getGeometryDescriptor

  val allTime: Interval  = new Interval(0, Long.MaxValue)
  val wholeWorld         = new Envelope(-180, -90, 180, 90)

  var spatialPredicate: BoundingBox  = null
  var temporalPredicate: Interval    = null

  val ff = CommonFactoryFinder.getFilterFactory2
  val geoFactory = JTSFactoryFinder.getGeometryFactory

  def visit(filter: Filter) =
    process(filter).accept(new SimplifyingFilterVisitor, null).asInstanceOf[Filter]

  def processChildren(op: BinaryLogicOperator, lf: (Filter, Filter) => Filter): Filter =
    op.getChildren.reduce { (l, r) => lf(process(l), process(r)) }
  
  def process(filter: Filter, acc: Filter = Filter.INCLUDE): Filter = filter match {
    // Logical filters
    case op: Or    => processChildren(op, ff.or)
    case op: And   => processChildren(op, ff.and)

    // Spatial filters
    case op: BBOX       => visitBBOX(op, acc)
    case op: DWithin    => visitDWithin(op, acc)
    case op: Within     => visitBinarySpatialOp(op, acc)
    case op: Intersects => visitBinarySpatialOp(op, acc)
    case op: Overlaps   => visitBinarySpatialOp(op, acc)

    // Temporal filters
    case op: Before     => acc
    case op: After      => acc
    case op: During     => acc
    case op: TContains  => acc

    // Other
    case op: PropertyIsBetween => acc

    // Catch all
    case f: Filter => f
  }

  private def visitBBOX(op: BBOX, acc: Filter): Filter = {
    val e1 = op.getExpression1.asInstanceOf[PropertyName]
    val attr = e1.evaluate(sft).asInstanceOf[AttributeDescriptor]
    if(!attr.getLocalName.equals(sft.getGeometryDescriptor.getLocalName)) {
      ff.and(acc, op)
    } else {
      spatialPredicate = op.getBounds
      acc
    }
  }

  private def visitBinarySpatialOp(op: BinarySpatialOperator, acc: Filter): Filter = {
    val e1 = op.getExpression1.asInstanceOf[PropertyName]
    val e2 = op.getExpression2.asInstanceOf[Literal]
    val attr = e1.evaluate(sft).asInstanceOf[AttributeDescriptor]
    if(!attr.getLocalName.equals(sft.getGeometryDescriptor.getLocalName)) {
      ff.and(acc, op)
    } else {
      val geom = e2.evaluate(null, classOf[Geometry])
      spatialPredicate = JTS.toEnvelope(geom)
      if(!geom.isRectangle) ff.and(acc, op)
      else acc
    }
  }

  def visitDWithin(op: DWithin, acc: Filter): Filter = {
    val e1 = op.getExpression1.asInstanceOf[PropertyName]
    val e2 = op.getExpression2.asInstanceOf[Literal]
    val attr = e1.evaluate(sft).asInstanceOf[AttributeDescriptor]
    if(!attr.getLocalName.equals(sft.getGeometryDescriptor.getLocalName)) {
      ff.and(acc, op)
    } else {
      val geom = e2.evaluate(null, classOf[Point])
      val geoCalc = new GeodeticCalculator(DefaultGeographicCRS.WGS84)
      geoCalc.setStartingGeographicPoint(geom.getX, geom.getY)
      geoCalc.setDirection(-180.0, op.getDistance)
      val farthestPoint = JTS.toGeometry(geoCalc.getDestinationPosition)
      val degreesDistance = geom.distance(farthestPoint)
      val buffer = geom.buffer(degreesDistance)
      spatialPredicate = JTS.toEnvelope(buffer)
      val rewrittenFilter =
        ff.dwithin(
          ff.literal(sft.getGeometryDescriptor.getLocalName),
          ff.literal(geom),
          degreesDistance,
          "meters")
      ff.and(acc, rewrittenFilter)
    }
  }
}