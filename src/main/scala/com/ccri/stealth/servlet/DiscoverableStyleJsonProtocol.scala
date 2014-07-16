package com.ccri.stealth.servlet

import com.ccri.whiptail.tracker.DiscoverableStyle
import spray.json.DefaultJsonProtocol

object DiscoverableStyleJsonProtocol extends DefaultJsonProtocol {
  implicit val stylesFormat = jsonFormat6(DiscoverableStyle)
}

