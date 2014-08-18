package org.locationtech.geomesa.plugin.process

import java.awt.image._
import java.util
import org.geoserver.catalog.Catalog
import org.geotools.coverage.CoverageFactoryFinder
import org.geotools.coverage.grid.GridCoverage2D
import org.geotools.data.simple.{SimpleFeatureSource, SimpleFeatureCollection}
import org.geotools.factory.CommonFactoryFinder
import org.geotools.feature.NameImpl
import org.geotools.geometry.DirectPosition2D
import org.geotools.geometry.jts.{JTS, ReferencedEnvelope}
import org.geotools.process.factory.{DescribeProcess, DescribeParameter, DescribeResult}
import org.geotools.process.vector.HeatmapProcess
import org.geotools.referencing.crs.DefaultGeographicCRS
import org.locationtech.geomesa.plugin.wps.GeomesaProcess
import scala.collection.JavaConversions._
import scala.util.Random
import weka.classifiers.functions.Logistic
import weka.core.{FastVector, Attribute, Instances, Instance}
import org.geotools.data.DataUtilities


@DescribeProcess(
  title = "Discrete Choice Model",
  description = "Prediction"
)
class DCMProcess(val catalog: Catalog) extends GeomesaProcess {

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

  @DescribeResult(
    name = "prediction",
    `type` = classOf[GridCoverage2D],
    description = "Prediction")
  def execute(
               @DescribeParameter(
                 name = "predictiveFeatures",
                 collectionType = classOf[String],
                 description = "Predictive Features"
               )
               featureNames: util.Collection[String],

               @DescribeParameter(
                 name = "events",
                 description = "Predict against"
               )
              response: SimpleFeatureCollection): GridCoverage2D = {

    val ff = CommonFactoryFinder.getFilterFactory2
    import org.locationtech.geomesa.utils.geotools.Conversions._
    val responseFeatures = response.features().toArray
    val bounds = DataUtilities.bounds(DataUtilities.collection(responseFeatures))
    val Array(lx,ly) = bounds.getLowerCorner.getCoordinate
    val Array(ux,uy) = bounds.getUpperCorner.getCoordinate
    val dx = ux - lx
    val dy = uy - ly
    val numAttrs = 1 + featureNames.size()
    val heatmapProcess = new HeatmapProcess()
    val coverages = featureNames.map { feature =>
      val Array(ns, fn) = feature.split(":")
      val fInfo = catalog.getFeatureTypeByName(ns, fn)
      val ds = fInfo.getStore.getDataStore(null)
      val fs = ds.getFeatureSource(new NameImpl(fn)).asInstanceOf[SimpleFeatureSource]
      val geomProp = fs.getSchema.getGeometryDescriptor.getLocalName
      val q = ff.within(ff.property(geomProp), ff.literal(JTS.toGeometry(bounds)))
      val features = fs.getFeatures(q)
      heatmapProcess.execute(features, 2, null, 1, bounds, 512, 512, null)
    }


    val positiveVecs =
      responseFeatures.map { f =>
        val loc = f.point
        val x = loc.getX
        val y = loc.getY
        val pos = new DirectPosition2D(x, y)
        val vec = coverages.map { c => c.evaluate(pos).asInstanceOf[Float] }
        val inst = new Instance(numAttrs)
        inst.setClassValue(1.0)
        vec.zipWithIndex.foreach { case (v, idx) => inst.setValue(idx, v.toDouble) }
        inst
      }
    val negativeVecs =
      List.fill(1000)((lx+Random.nextDouble()*dx, ly+Random.nextDouble()*dy)).map { case (x,y) =>
        val pos = new DirectPosition2D(x, y)
        val vec = coverages.map { c => c.evaluate(pos).asInstanceOf[Float] }
        val inst = new Instance(numAttrs)
        inst.setClassValue(0.0)
        vec.zipWithIndex.foreach { case (v, idx) => inst.setValue(idx, v.toDouble) }
        inst
      }

    val classifier = new Logistic
    val attributes = featureNames.map { fn => new Attribute(fn) }
    val fv = new FastVector(numAttrs)
    fv.addElement(new Attribute("class"))
    attributes.foreach(fv.addElement(_))
    val instances = new Instances("data", fv, positiveVecs.length + negativeVecs.length)
    instances.setClassIndex(0)
    (positiveVecs ++ negativeVecs).foreach { v => instances.add(v) }
    classifier.buildClassifier(instances)
    null
  }
}
