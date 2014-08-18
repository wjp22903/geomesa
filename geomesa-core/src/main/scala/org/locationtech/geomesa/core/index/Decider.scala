package org.locationtech.geomesa.core.index

import org.geotools.data.Query
import org.locationtech.geomesa.core.data.AccumuloConnectorCreator
import org.opengis.feature.simple.SimpleFeatureType

object Decider {


  def chooseStrategy(acc: AccumuloConnectorCreator,
                     iqp: IndexQueryPlanner,
                     sft: SimpleFeatureType,
                     derivedQuery: Query,
                     isDensity: Boolean,
                     output: ExplainerOutputType): Strategy = {


    new StIdxStrategy(iqp)
  }
}
