package geomesa.core.transform

import org.geotools.data.simple.SimpleFeatureSource
import org.geotools.process.vector.TransformProcess.Definition
import geomesa.core.data.AccumuloFeatureSource

class Transforms {
  def transform(sfs: SimpleFeatureSource, transforms: Seq[Definition]): SimpleFeatureSource = {
    val fs = sfs.asInstanceOf[AccumuloFeatureSource]
    fs.setTransform(transforms)
    fs
  }

}
