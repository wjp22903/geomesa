/*
 * Copyright 2013 Commonwealth Computer Research, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an AS IS BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package geomesa.core.data

import collection.JavaConversions._
import com.vividsolutions.jts.geom._
import geomesa.core.index
import geomesa.utils.geotools.Conversions._
import geomesa.utils.geotools.GeometryUtils
import geomesa.utils.text.WKTUtils
import org.geotools.data.Query
import org.geotools.factory.CommonFactoryFinder
import org.geotools.filter.visitor.SimplifyingFilterVisitor
import org.geotools.geometry.jts.{JTSFactoryFinder, JTS}
import org.geotools.referencing.GeodeticCalculator
import org.geotools.referencing.crs.DefaultGeographicCRS
import org.joda.time.format.ISODateTimeFormat
import org.joda.time.{DateTimeZone, DateTime, Interval}
import org.opengis.feature.`type`.AttributeDescriptor
import org.opengis.feature.simple.SimpleFeatureType
import org.opengis.filter._
import org.opengis.filter.expression._
import org.opengis.filter.spatial._
import org.opengis.filter.temporal._
import org.opengis.temporal.Instant

// FilterToAccumulo extracts the spatial and temporal predicates from the
// filter while rewriting the filter to optimize for scanning Accumulo
class FilterToAccumulo(sft: SimpleFeatureType) {

  val dtgField  = index.getDtgDescriptor(sft)
  val geomField = sft.getGeometryDescriptor

  val allTime              = new Interval(0, Long.MaxValue)
  val wholeWorld           = new Envelope(-180, -90, 180, 90)

  val noPolygon : Polygon  = null
  val noInterval: Interval = null

  var spatialPredicate:  Polygon  = noPolygon
  var temporalPredicate: Interval = noInterval

  val ff = CommonFactoryFinder.getFilterFactory2
  val geoFactory = JTSFactoryFinder.getGeometryFactory

  implicit def env2poly(env: Envelope): Polygon = WKTUtils.read(
    "POLYGON((" +
      env.getMinX + " " + env.getMinY + ", " +
      env.getMinX + " " + env.getMaxY + ", " +
      env.getMaxX + " " + env.getMaxY + ", " +
      env.getMaxX + " " + env.getMinY + ", " +
      env.getMinX + " " + env.getMinY +
    "))"
  ).asInstanceOf[Polygon]

  def visit(query: Query): Filter = visit(query.getFilter)
  def visit(filter: Filter): Filter =
    process(filter).accept(new SimplifyingFilterVisitor, null).asInstanceOf[Filter]

  case class EvalNode(raw: Filter, evaluated: Filter, polygon: Polygon, interval: Interval)

  def getSafeUnionPolygon(a: Polygon, b: Polygon): Polygon = {
    if (a != noPolygon && b != noPolygon) {
      if (a.overlaps(b)) {
        val p = a.union(b)
        p.normalize()
        p.asInstanceOf[Polygon]
      } else {
        // they don't overlap; take the merge of their envelopes
        // (since we don't support MultiPolygon returns yet)
        val env = a.getEnvelopeInternal
        env.expandToInclude(b.getEnvelopeInternal)
        env2poly(env)
      }
    } else noPolygon
  }

  def getSafeUnionInterval(a: Interval, b: Interval): Interval = {
    if (a != noInterval && b != noInterval) {
      new Interval(
        if (a.getStart.isBefore(b.getStart)) a.getStart else b.getStart,
        if (a.getEnd.isAfter(b.getEnd)) a.getEnd else b.getEnd
      )
    } else noInterval
  }

  def simplifyChildren(nodes: Seq[EvalNode], fnx: (Filter, Filter) => Filter): Filter = {
    nodes.map(_.evaluated).filter(_ != Filter.INCLUDE) match {
      case children if children.size == 0 => Filter.INCLUDE
      case children if children.size == 1 => children.head
      case children =>
        children.foldLeft(children.head)((filterSoFar, child) => ff.or(filterSoFar, child))
    }
  }

  def evaluateChildrenIndependently(filter: BinaryLogicOperator): Seq[EvalNode] = filter.getChildren.map(child => {
    val oldPolygon = spatialPredicate
    val oldInterval = temporalPredicate
    spatialPredicate = noPolygon
    temporalPredicate = noInterval
    val childEval = process(child)
    val p = spatialPredicate
    val t = temporalPredicate
    spatialPredicate = oldPolygon
    temporalPredicate = oldInterval
    EvalNode(child, childEval, p, t)
  })

  def processOrChildren(op: BinaryLogicOperator): Filter = {
    // evaluate all children independently
    val nodes = evaluateChildrenIndependently(op)

    spatialPredicate = noPolygon
    temporalPredicate = noInterval

    // you can reduce a sequence of nodes if they all set (only) geometry
    val onlyPolygons = nodes.filter(node => node.polygon != noPolygon && node.interval == noInterval)
    if (onlyPolygons.size == nodes.size) {
      if (spatialPredicate == noPolygon) spatialPredicate = nodes.head.polygon
      spatialPredicate = nodes.foldLeft(spatialPredicate)((pSoFar, node) =>
        getSafeUnionPolygon(pSoFar, node.polygon)
      )
      simplifyChildren(nodes, ff.or)
    } else {
      // you can reduce a sequence of nodes if they all set (only) time
      val onlyIntervals = nodes.filter(node => node.polygon == noPolygon && node.interval != noInterval)
      if (onlyIntervals.size == nodes.size) {
        if (temporalPredicate == noInterval) temporalPredicate = nodes.head.interval
        temporalPredicate = nodes.foldLeft(temporalPredicate)((iSoFar, node) =>
            getSafeUnionInterval(iSoFar, node.interval)
        )
        simplifyChildren(nodes, ff.or)
      } else op
    }
  }

  def processAndChildren(op: BinaryLogicOperator): Filter = {
    spatialPredicate = noPolygon
    temporalPredicate = noInterval
    val firstChildEval = process(op.getChildren.head)
    val result = op.getChildren.tail.foldLeft((firstChildEval, spatialPredicate, temporalPredicate))((t, child) => t match {
      case (lastChildEval, polygonSoFar, intervalSoFar) =>
        // this evaluation updates the (child) estimate of temporalPredicate and spatialPredicate
        spatialPredicate = noPolygon
        temporalPredicate = noInterval
        val childEval = process(child)
        val nextPolygon = (polygonSoFar, spatialPredicate) match {
          case (a, b) if a == null && b != null => b
          case (a, b) if b == null && a != null => a
          case (a, b) if a == null || b == null => noPolygon
          case (a, b) =>
            if (a.intersects(b)) {
              val p = a.intersection(b).asInstanceOf[Polygon]
              p.normalize()
              p
            }
            else noPolygon
        }
        val nextInterval = (intervalSoFar, temporalPredicate) match {
          case (a, b) if a == null && b != null => b
          case (a, b) if b == null && a != null => a
          case (a, b) if a == null || b == null => noInterval
          case (a, b) =>
            if (a.overlap(b) != null) a.overlap(b) else noInterval
        }
        val nextEval = (lastChildEval, childEval) match {
          case (Filter.EXCLUDE, _) => Filter.EXCLUDE
          case (_, Filter.EXCLUDE) => Filter.EXCLUDE
          case (Filter.INCLUDE, _) => childEval
          case (_, Filter.INCLUDE) => lastChildEval
          case _                   => ff.and(lastChildEval, childEval)
        }
        (nextEval, nextPolygon, nextInterval)
    })

    spatialPredicate = result._2
    temporalPredicate = result._3
    result._1
  }

  def process(filter: Filter, acc: Filter = Filter.INCLUDE): Filter = filter match {
    // Logical filters
    case op: Or    => processOrChildren(op)
    case op: And   => processAndChildren(op)

    // Spatial filters
    case op: BBOX       => visitBBOX(op, acc)
    case op: DWithin    => visitDWithin(op, acc)
    case op: Within     => visitBinarySpatialOp(op, acc)
    case op: Intersects => visitBinarySpatialOp(op, acc)
    case op: Overlaps   => visitBinarySpatialOp(op, acc)

    // Temporal filters
    case op: BinaryTemporalOperator => visitBinaryTemporalOp(op, acc)

    // Other
    case op: PropertyIsBetween      => visitPropertyIsBetween(op, acc)

    // Catch all
    case f: Filter => ff.and(acc, f)
  }

  private def visitBBOX(op: BBOX, acc: Filter): Filter = {
    val e1 = op.getExpression1.asInstanceOf[PropertyName]
    val attr = e1.evaluate(sft).asInstanceOf[AttributeDescriptor]
    if(!attr.getLocalName.equals(sft.getGeometryDescriptor.getLocalName)) {
      ff.and(acc, op)
    } else {
      spatialPredicate = JTS.toGeometry(op.getBounds)
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
      spatialPredicate = geom.asInstanceOf[Polygon]
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
      val geoCalc = new GeodeticCalculator(DefaultGeographicCRS.WGS84)
      val startPoint = e2.evaluate(null, classOf[Point])
      val distance = op.getDistance

      // Convert meters to dec degrees based on widest point in dec degrees of circle
      geoCalc.setStartingGeographicPoint(startPoint.getX, startPoint.getY)
      geoCalc.setDirection(90, distance)
      val right = geoCalc.getDestinationGeographicPoint
      val distanceDegrees = startPoint.distance(geoFactory.createPoint(new Coordinate(right.getX, right.getY)))

      // Walk circle bounds for bounding box
      spatialPredicate = GeometryUtils.bufferPoint(startPoint, distance)

      val rewrittenFilter =
        ff.dwithin(
          ff.property(sft.getGeometryDescriptor.getLocalName),
          ff.literal(startPoint),
          distanceDegrees,
          "meters")
      ff.and(acc, rewrittenFilter)
    }
  }

  def visitBinaryTemporalOp(bto: BinaryTemporalOperator, acc: Filter): Filter = {
    val prop     = bto.getExpression1.asInstanceOf[PropertyName]
    val lit      = bto.getExpression2.asInstanceOf[Literal]
    val attr     = prop.evaluate(sft).asInstanceOf[AttributeDescriptor]
    if(!attr.getLocalName.equals(dtgField.getLocalName)) ff.and(acc, bto)
    else {
      val period = lit.evaluate(null).asInstanceOf[org.opengis.temporal.Period]
      temporalPredicate = bto match {
        case op: Before    => new Interval(new DateTime(0L), period.getEnding)
        case op: After     => new Interval(period.getBeginning, new DateTime(Long.MaxValue))
        case op: During    => new Interval(period.getBeginning, period.getEnding)
        case op: TContains => new Interval(period.getBeginning, period.getEnding)
        case _             => throw new IllegalArgumentException("Invalid query")
      }
      acc
    }
  }

  def visitPropertyIsBetween(op: PropertyIsBetween, acc: Filter): Filter = {
    val prop = op.getExpression.asInstanceOf[PropertyName]
    val attr = prop.evaluate(sft).asInstanceOf[AttributeDescriptor]
    if(!attr.getLocalName.equals(dtgField.getLocalName)) ff.and(acc, op)
    else {
      val start = extractDTG(op.getLowerBoundary.evaluate(null))
      val end   = extractDTG(op.getUpperBoundary.evaluate(null))
      temporalPredicate = new Interval(start, end)
      acc
    }
  }

  private def extractDTG(o: AnyRef) = parseDTG(o).withZone(DateTimeZone.UTC)

  private def parseDTG(o: AnyRef): DateTime = o match {
    case i:  Instant                => new DateTime(i.getPosition.getDate.getTime)
    case d:  java.util.Date         => new DateTime(d.getTime)
    case j:  org.joda.time.Instant  => j.toDateTime
    case dt: DateTime               => dt
    case s:  String                 => ISODateTimeFormat.dateTime().parseDateTime(s)
    case _                          => throw new IllegalArgumentException("Unknown dtg type")
  }

}
