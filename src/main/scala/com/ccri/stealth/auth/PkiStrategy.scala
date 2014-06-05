package com.ccri.stealth.auth

import java.security.cert.X509Certificate
import javax.servlet.http.{HttpServletResponse, HttpServletRequest}
import org.scalatra.ScalatraBase
import org.scalatra.auth.ScentryStrategy
import org.slf4j.LoggerFactory

class PkiStrategy(protected val app: ScalatraBase)(implicit request: HttpServletRequest, response: HttpServletResponse)
  extends ScentryStrategy[User] {

  val logger = LoggerFactory.getLogger(getClass)

  override def name: String = "Pki"
  override def isValid: Boolean = true

  def authenticate(): Option[User] = {
    val certs = request.getAttribute("javax.servlet.request.X509Certificate").asInstanceOf[Array[X509Certificate]]
    if (certs != null && certs.length > 0) {
      Some(User(certs.head.getSubjectX500Principal.getName))
    } else {
      None
    }
  }
}
