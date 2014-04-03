package com.ccri.stealth.web

import spray.json._
import com.ccri.stealth.service.{MapService, BasemapConfig}

/**
 * Created by mforkin on 3/26/14.
 */
trait MapMarshalling extends APIMarshalling {
  implicit val basemapFormat = jsonFormat11(BasemapConfig)
}
class MapAPI extends API with MapService with MapMarshalling {
  get("/basemapconf") {
    getBaseMapGeoserverParams.toJson
  }
}
