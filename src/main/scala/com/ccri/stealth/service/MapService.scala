package com.ccri.stealth.service

/**
 * Created by mforkin on 3/26/14.
 */

case class BasemapConfig(
  url: String,
  baseLayers: String,
  format: String,
  attribution: String,
  transparent: Boolean,
  crs: String,
  centerLat: Double,
  centerLon: Double,
  defaultZoom: Int,
  maxZoom: Int,
  minZoom: Int
)

trait MapService extends Service {
  def getBaseMapGeoserverParams = {
    val mc = conf.getConfig("map")
    BasemapConfig(
      mc.getString("url"),
      mc.getString("baselayers"),
      mc.getString("format"),
      "CCRi",
      mc.getBoolean("transparent"),
      mc.getString("crs"),
      mc.getDouble("defaultLat"),
      mc.getDouble("defaultLon"),
      mc.getInt("defaultZoom"),
      mc.getInt("maxZoom"),
      mc.getInt("minZoom")
    )
  }
}
