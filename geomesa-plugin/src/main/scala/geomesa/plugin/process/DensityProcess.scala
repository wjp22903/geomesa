package geomesa.plugin.process

import org.geotools.process.vector.HeatmapProcess
import org.geotools.process.factory.DescribeProcess
import org.geotools.geometry.jts.ReferencedEnvelope
import org.geotools.data.Query
import org.opengis.coverage.grid.GridGeometry
import geomesa.core.data.AccumuloFeatureReader

@DescribeProcess(
  title = "Heatmap",
  description = "Computes a heatmap surface over a set of data points and outputs as a single-band raster."
)
class DensityProcess extends HeatmapProcess {
  override def invertQuery(argRadiusPixels: Integer,
                           argOutputEnv: ReferencedEnvelope,
                           argOutputWidth: Integer,
                           argOutputHeight: Integer,
                           targetQuery: Query,
                           targetGridGeometry: GridGeometry): Query = {
    val q =
      super.invertQuery(argRadiusPixels,
        argOutputEnv,
        argOutputWidth,
        argOutputHeight,
        targetQuery,
        targetGridGeometry)

    q.getHints().put(AccumuloFeatureReader.DENSITY_KEY, java.lang.Boolean.TRUE)
    q
  }
}
