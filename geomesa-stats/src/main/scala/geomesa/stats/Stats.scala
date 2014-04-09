package geomesa.stats

import collection.JavaConversions._
import com.vividsolutions.jts.geom.Geometry
import geomesa.utils.geotools.Conversions._
import org.geotools.data.simple.SimpleFeatureCollection
import org.geotools.factory.CommonFactoryFinder
import org.opengis.filter.expression.PropertyName
import org.saddle._
import scala.reflect.ClassTag

object Stats {

  implicit class SimpleFeatureCollectionStats(val col: SimpleFeatureCollection)  {
    val ff = CommonFactoryFinder.getFilterFactory2
    val sft = col.getSchema

    lazy val toFrame: Frame[Int, String, _] = {
      val columnNames = sft.getAttributeDescriptors.map { _.getLocalName }
      val columnTypes = sft.getAttributeDescriptors.map { _.getType.getBinding }

      val columns = columnNames.zip(columnTypes).map { case (colname, coltype) =>
        val extractor = ff.property(colname)
        val column = coltype match {
          case t if classOf[java.lang.Integer].equals(t)  => extractCol[Integer](col, extractor)
          case t if classOf[java.lang.Double].equals(t)   => extractCol[Double](col, extractor)
          case t if classOf[java.lang.Float].equals(t)    => extractCol[Float](col, extractor)
          case t if classOf[java.lang.String].equals(t)   => extractCol[String](col, extractor)
          case t if classOf[java.util.Date].equals(t)     => extractCol[java.util.Date](col, extractor)
          case t if classOf[Geometry].isAssignableFrom(t) => extractCol[Geometry](col, extractor)
        }
        column
      }

      Panel(columns, Index(columnNames: _*))
    }

    private def extractCol[T](col: SimpleFeatureCollection, extractor: PropertyName)(implicit ct: ClassTag[T]): Vec[T] = {
      val res = col.features.map { sf => extractor.evaluate(sf, ct.runtimeClass).asInstanceOf[T] }
      Vec(res.toArray)
    }
  }

}
