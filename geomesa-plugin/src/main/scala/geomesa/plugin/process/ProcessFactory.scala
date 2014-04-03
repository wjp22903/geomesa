package geomesa.plugin.process

import org.geotools.process.factory.AnnotatedBeanProcessFactory
import org.geotools.text.Text

class ProcessFactory
  extends AnnotatedBeanProcessFactory(
    Text.text("GeoMesa Process Factory"),
    "geomesa",
    classOf[DensityProcess])

