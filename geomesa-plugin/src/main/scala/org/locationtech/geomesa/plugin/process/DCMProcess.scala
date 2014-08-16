package org.locationtech.geomesa.plugin.process

import java.awt.image._

import org.geotools.coverage.CoverageFactoryFinder
import org.geotools.geometry.jts.ReferencedEnvelope
import org.geotools.referencing.crs.DefaultGeographicCRS

class DCMProcess {

  def createCoverage() = {
    val gcf = CoverageFactoryFinder.getGridCoverageFactory(null)
    val env = new ReferencedEnvelope(-80, -70, 30, 40, DefaultGeographicCRS.WGS84)
    val raster = Raster.createBandedRaster(DataBuffer.TYPE_INT, 1024, 1024, 1, null)
    val dataBuf = raster.getDataBuffer
    val grid = gcf.create("grid", raster, env)

    val nrows = 1024
    val ncols = 1024

    val xform = grid.getGridGeometry.getGridToCRS2D
    val locs =
      (0 until nrows).map { row =>
        val vec = (0 until ncols).flatMap { col => Array[Double](col, row) }
        val res = Array.fill[Double](2*ncols)(0.0)
        xform.transform(vec.toArray, 0, res, 0, ncols)
        res.sliding(2, 2).toArray
      }
    locs
  }
}
