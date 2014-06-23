package geomesa.core.iterators

import com.vividsolutions.jts.geom.Polygon
import geomesa.core.index.IndexSchema
import geomesa.core.index.IndexSchema.DecodedIndexValue
import org.apache.accumulo.core.data.{ByteSequence, Range, Value, Key}
import org.apache.accumulo.core.iterators.{IteratorEnvironment, SortedKeyValueIterator}
import java.util.{Map => JMap, Collection => JCollection}

import org.geotools.geometry.jts.{JTS, ReferencedEnvelope}
import org.geotools.referencing.crs.DefaultGeographicCRS
import org.joda.time.Interval

class AttributeIndexFilteringIterator extends SortedKeyValueIterator[Key, Value] {

  var sourceIter: SortedKeyValueIterator[Key, Value] = null
  var topKey: Key = null
  var topValue: Value = null
  var bbox: Polygon = null
  var interval: Interval = null

  def init(source: SortedKeyValueIterator[Key, Value],
           options: JMap[String, String],
           env: IteratorEnvironment) {
    val Array(minx, miny, maxx, maxy) = options.get("geomesa.bbox").split(",").map(_.toDouble)
    val re = new ReferencedEnvelope(minx, maxx, miny, maxy, DefaultGeographicCRS.WGS84)
    bbox = JTS.toGeometry(re)
    interval = Interval.parse(options.get("geomesa.interval"))
    sourceIter = source.deepCopy(env)
  }

  override def hasTop: Boolean = topKey != null

  override def deepCopy(env: IteratorEnvironment) = throw new IllegalArgumentException("not supported")

  override def next(): Unit = {
    topKey = null
    topValue = null
    while(sourceIter.hasTop && topKey == null && topValue == null) {
      val DecodedIndexValue(_, geom, dtgOpt) = IndexSchema.decodeIndexValue(sourceIter.getTopValue)
      if (bbox.contains(geom) && dtgOpt.map(dtg => interval.contains(dtg)).getOrElse(true)) {
        topKey = new Key(sourceIter.getTopKey)
        topValue = new Value(sourceIter.getTopValue)
      } else {
        sourceIter.next()
      }
    }
  }

  override def getTopValue: Value = topValue

  override def getTopKey: Key = topKey

  override def seek(range: Range, columnFamilies: JCollection[ByteSequence], inclusive: Boolean): Unit = {
    sourceIter.seek(range, columnFamilies, inclusive)
    next()
  }
}
