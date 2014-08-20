package org.locationtech.geomesa.plugin.process

import com.vividsolutions.jts.geom.{Coordinate, Envelope, Geometry}
import com.vividsolutions.jts.index.strtree.{GeometryItemDistance, STRtree}
import com.vividsolutions.jts.operation.distance.DistanceOp
import org.geotools.coverage.CoverageFactoryFinder
import org.geotools.coverage.grid.GridCoverage2D
import org.geotools.data.simple.SimpleFeatureCollection
import org.geotools.factory.GeoTools
import org.geotools.geometry.jts.{JTS, JTSFactoryFinder, ReferencedEnvelope}
import org.geotools.process.factory.{DescribeParameter, DescribeProcess, DescribeResult}
import org.geotools.referencing.crs.DefaultGeographicCRS
import org.locationtech.geomesa.plugin.wps.GeomesaProcess
import org.locationtech.geomesa.utils.geotools.Conversions._

@DescribeProcess(
  title = "Feature Distance Process",
  description = "Converts a Vector source in a grid of distances"
)
class FeatureDistanceProcess extends GeomesaProcess {

  @DescribeResult(
    name = "result",
    `type` = classOf[GridCoverage2D]
  )
  def execute(
               @DescribeParameter(
                 name = "data",
                 description = "Input features"
               )
               obsFeatures: SimpleFeatureCollection,

               @DescribeParameter(
                 name = "outputBBOX",
                 description = "Bounding box of the output")
               argOutputEnv: ReferencedEnvelope,

               @DescribeParameter(
                 name = "outputWidth",
                 description = "Width of output raster in pixels")
               argOutputWidth: java.lang.Integer,

               @DescribeParameter(
                 name = "outputHeight",
                 description = "Height of output raster in pixels")
               argOutputHeight: Integer
  ): GridCoverage2D = {

    val index = new STRtree
    obsFeatures.features().foreach { f => index.insert(f.geometry.getEnvelopeInternal, f.geometry) }
    index.build()

    val gt = new GridTransform(argOutputEnv, argOutputWidth, argOutputHeight)
    val geomFactory = JTSFactoryFinder.getGeometryFactory
    val distMeasure = new GeometryItemDistance
    val distances =
      (0 until argOutputWidth).map { i =>
        val rowCoord = new Coordinate(gt.x(i), 0)
        (0 until argOutputHeight).map { j =>
          rowCoord.setOrdinate(1, gt.y(j))
          val pt = geomFactory.createPoint(rowCoord)
          val nearest = index.nearestNeighbour(pt.getEnvelopeInternal, pt, distMeasure)
          val closestOnTargetGeom = DistanceOp.nearestPoints(nearest.asInstanceOf[Geometry], pt).head
          JTS.orthodromicDistance(closestOnTargetGeom, rowCoord, DefaultGeographicCRS.WGS84).toFloat
        }.toArray
    }.toArray

    val gcf = CoverageFactoryFinder.getGridCoverageFactory(GeoTools.getDefaultHints)
    gcf.create("Process Results", distances, argOutputEnv)
  }
}

class GridTransform(env: Envelope, xSize: Int, ySize: Int) {
  val dx = env.getWidth / (xSize - 1)
  val dy = env.getHeight / (ySize - 1)


  /**
   * Computes the X ordinate of the i'th grid column.
   * @param i the index of a grid column
   * @return the X ordinate of the column
   */
  def x(i: Int) =
    if (i >= xSize - 1) env.getMaxX
    else env.getMinX + i * dx

  /**
   * Computes the Y ordinate of the i'th grid row.
   * @param j the index of a grid row
   * @return the Y ordinate of the row
   */
  def y(j: Int) =
    if (j >= ySize - 1) env.getMaxY
    else env.getMinY + j * dy

  /**
   * Computes the column index of an X ordinate.
   * @param x the X ordinate
   * @return the column index
   */
  def i(x: Double) = x match {
    case _ if x > env.getMaxX => xSize
    case _ if x < env.getMinX => -1
    case _ =>
      val ii: Int = ((x - env.getMinX) / dx).toInt
      // have already check x is in bounds, so ensure returning a valid value
      if (ii >= xSize) xSize - 1
      else ii
  }

  /**
   * Computes the column index of an Y ordinate.
   * @param y the Y ordinate
   * @return the column index
   */
  def j(y: Double) = y match {
    case _ if y > env.getMaxY => ySize
    case _ if y < env.getMinY => -1
    case _ =>
      val jj: Int = ((y - env.getMinY) / dy).toInt
      // have already check x is in bounds, so ensure returning a valid value
      if (jj >= ySize) ySize - 1
      else jj
  }

}