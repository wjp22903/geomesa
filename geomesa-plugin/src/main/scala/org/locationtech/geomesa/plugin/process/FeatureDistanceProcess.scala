package org.locationtech.geomesa.plugin.process

import com.vividsolutions.jts.geom.{Coordinate, Geometry}
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
import org.locationtech.geomesa.utils.geotools.GridSnap

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

    val gt = new GridSnap(argOutputEnv, argOutputWidth, argOutputHeight)
    val geomFactory = JTSFactoryFinder.getGeometryFactory
    val distMeasure = new GeometryItemDistance
    val distances =
      (0 until argOutputWidth).map { col =>
        val rowCoord = new Coordinate(gt.x(col), 0)
        (0 until argOutputHeight).map { row =>
          rowCoord.setOrdinate(Coordinate.Y, gt.y(row))
          val pt = geomFactory.createPoint(rowCoord)
          val nearest = index.nearestNeighbour(pt.getEnvelopeInternal, pt, distMeasure)
          val closestOnTargetGeom = DistanceOp.nearestPoints(nearest.asInstanceOf[Geometry], pt).head
          JTS.orthodromicDistance(closestOnTargetGeom, rowCoord, DefaultGeographicCRS.WGS84).toFloat
        }.toArray
    }.toArray

    val gcf = CoverageFactoryFinder.getGridCoverageFactory(GeoTools.getDefaultHints)
    gcf.create("Process Results", GridUtils.flipXY(distances), argOutputEnv)
  }

}

object GridUtils {
  def flipXY(grid: Array[Array[Float]]) =  {
    val xsize = grid.length
    val ysize = grid(0).length
    val grid2 = Array.ofDim[Float](xsize, ysize)
    (0 until xsize).foreach { ix =>
      (0 until ysize).foreach { iy =>
        val iy2 = ysize - iy - 1
        grid2(iy2)(ix) = grid(ix)(iy)
      }
    }
    grid2
  }
}