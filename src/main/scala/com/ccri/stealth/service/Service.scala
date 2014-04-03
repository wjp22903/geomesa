package com.ccri.stealth.service

import com.typesafe.config.ConfigFactory
import java.sql.Date

/**
 * Created by mforkin on 3/26/14.
 */
trait Service {
  implicit def jodaDate2SqlDate(d: org.joda.time.DateTime) = new Date(d.getMillis)
  implicit def sqlDate2JodaDate(d: Date) = new org.joda.time.DateTime(d.getTime)
  implicit def listInt2ListInteger(i: List[Int]) = i.map(_.asInstanceOf[Integer])
  val conf = ConfigFactory.load()
}
