package com.ccri.stealth.web

import spray.json._
import com.ccri.stealth.service.{MapService, BasemapConfig}

trait MapMarshalling extends APIMarshalling {
  implicit val basemapFormat = jsonFormat7(BasemapConfig)
}
class MapAPI extends API with MapService with MapMarshalling {
  get("/basemapconf") {
    getBaseMapGeoserverParams.toJson
  }
}
