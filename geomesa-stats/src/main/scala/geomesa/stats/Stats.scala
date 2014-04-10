package geomesa.stats

import collection.JavaConversions._
import com.vividsolutions.jts.geom.{Polygon, Geometry}
import geomesa.plugin.process.DensityProcess
import geomesa.utils.geotools.Conversions._
import java.awt.geom.AffineTransform
import java.awt.image.BufferedImage
import java.awt.{Graphics2D, Graphics}
import javax.swing.{JFrame, JPanel}
import org.geotools.coverage.grid.GridCoverage2D
import org.geotools.data.Query
import org.geotools.data.simple.{SimpleFeatureSource, SimpleFeatureCollection}
import org.geotools.factory.CommonFactoryFinder
import org.geotools.filter.visitor.DefaultFilterVisitor
import org.geotools.geometry.jts.{JTS, ReferencedEnvelope}
import org.geotools.referencing.crs.DefaultGeographicCRS
import org.opengis.coverage.grid.GridGeometry
import org.opengis.filter.Filter
import org.opengis.filter.expression.PropertyName
import org.opengis.filter.spatial.{Within, BBOX}
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

  implicit class RichSimpleFeatureSource(val fs: SimpleFeatureSource) extends AnyVal {

    def getCoverage(filter: Filter,
                    radiusPixels: Int,
                    width: Int,
                    height: Int) = {
      val env = filter.accept(EnvelopeExtractingFilterVisitor, null).asInstanceOf[ReferencedEnvelope]
      val hm = new DensityProcess
      val targetQuery = new Query("geomesa-density", filter)
      val targetGridGeometry = null.asInstanceOf[GridGeometry]
      val invertQuery = hm.invertQuery(radiusPixels, env, width, height, targetQuery, targetGridGeometry)
      val results = fs.getFeatures(invertQuery)
      hm.execute(results, radiusPixels, "geom", 1, env, width, height, null)
    }
  }

  val EnvelopeExtractingFilterVisitor = new DefaultFilterVisitor {
    override def visit(filter: BBOX, data: scala.Any): AnyRef = new ReferencedEnvelope(filter.getBounds)
    override def visit(filter: Within, data: scala.Any): AnyRef =
      JTS.bounds(filter.getExpression2.evaluate(null).asInstanceOf[Polygon], DefaultGeographicCRS.WGS84)
  }

  implicit class RichGridCoverage(val coverage: GridCoverage2D) extends AnyVal {
    def show: Unit = {
      val scaleXform = AffineTransform.getScaleInstance(1f, 1f)
      val frame = new JFrame()
      frame.setSize(200, 200)
      val panel = new JPanel {
        override def paintComponents(g: Graphics): Unit = {
          super.paintComponents(g)
          val image = new BufferedImage(200, 200, BufferedImage.TYPE_INT_RGB)
          image.setData(coverage.getRenderedImage.getData)
          g.asInstanceOf[Graphics2D].drawImage(image, scaleXform, null)
        }
      }
      frame.add(panel)
      frame.setVisible(true)
    }
  }

}
