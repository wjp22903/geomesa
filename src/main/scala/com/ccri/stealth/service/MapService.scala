package com.ccri.stealth.service

case class BasemapConfig(
  url: String,
  baseLayers: String,
  format: String,
  crs: String,
  centerLat: Double,
  centerLon: Double,
  defaultZoom: Int
)

trait MapService extends Service {
  def getBaseMapGeoserverParams = {
    val mc = conf.getConfig("map")
    BasemapConfig(
      mc.getString("url"),
      mc.getString("baselayers"),
      mc.getString("format"),
      mc.getString("crs"),
      mc.getDouble("defaultLat"),
      mc.getDouble("defaultLon"),
      mc.getInt("defaultZoom")
    )
  }
}
