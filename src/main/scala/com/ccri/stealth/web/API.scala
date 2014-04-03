package com.ccri.stealth.web

import org.scalatra.ScalatraServlet
import spray.json._
import java.sql.Date
import java.math

trait APIMarshalling extends DefaultJsonProtocol {
  implicit val DateFormat = new RootJsonFormat[Date] {
    def write(obj: Date): JsValue = JsString(obj.getTime.toString)
    def read(json: JsValue) = json match {
      case JsString(str) => new Date(str.toLong)
      case _ => deserializationError("Unknown Type")
    }
  }
  implicit val BigDecimalFormat = new RootJsonFormat[java.math.BigDecimal] {
    def write(obj: java.math.BigDecimal): JsValue = JsString(obj.toString)
    def read(json: JsValue): java.math.BigDecimal = json match {
      case JsString(str) => new math.BigDecimal(str.toLong)
      case _ => deserializationError("Unknown Type")
    }
  }
}

/**
 * Created by mforkin on 3/26/14.
 */
trait API extends ScalatraServlet with APIMarshalling {
  before() {
    contentType = "application/json"
  }

  def extractParam[T] (paramId: String, defaultValue: T) = if (params.contains(paramId)) {
    params(paramId).asInstanceOf[T]
  } else { defaultValue }
}
