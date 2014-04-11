package geomesa.filter.function

import com.vividsolutions.jts.geom.{Point, Geometry}
import java.nio.{ByteOrder, ByteBuffer}
import org.geotools.data.Base64
import org.geotools.filter.FunctionExpressionImpl
import org.geotools.filter.capability.FunctionNameImpl
import org.geotools.filter.capability.FunctionNameImpl._

class Convert2ViewerFunction
  extends FunctionExpressionImpl(
    new FunctionNameImpl(
      "convert2viewer",
      classOf[String],
      parameter("id", classOf[String]),
      parameter("geom", classOf[Geometry]),
      parameter("dtg", classOf[Long])
    )) {

  override def evaluate(obj: scala.Any) = {
    val id    = getExpression(0).evaluate(obj).asInstanceOf[String]
    val geom  = getExpression(1).evaluate(obj).asInstanceOf[Point]
    val dtg   = dtg2Long(getExpression(2).evaluate(obj))

    val buf = ByteBuffer.allocate(24).order(ByteOrder.LITTLE_ENDIAN)
    buf.putInt(0)
    buf.putInt(dtg.toInt)
    buf.putFloat(geom.getY.toFloat)
    buf.putFloat(geom.getX.toFloat)
    buf.put(id.getBytes.take(8))
    Base64.encodeBytes(buf.array())
  }

  private def dtg2Long(d: Any): Long = d match {
    case l:    Long                           => l
    case jud:  java.util.Date                 => jud.getTime
    case inst: org.joda.time.ReadableInstant  => inst.getMillis
    case inst: org.opengis.temporal.Instant   => inst.getPosition.getDate.getTime
  }

}

