package com.ccri.stealth.auth

import org.scalatra.ScalatraBase
import org.scalatra.auth.{ScentrySupport, ScentryConfig}

trait PkiAuthenticationSupport extends ScalatraBase with ScentrySupport[User] {
  protected def fromSession = { case dn: String => User(dn) }
  protected def toSession = { case usr: User => usr.dn }
  protected val scentryConfig = (new ScentryConfig {}).asInstanceOf[ScentryConfiguration]

  override protected def registerAuthStrategies = {
    scentry.register("Pki", app => new PkiStrategy(app))
  }
}
