package com.ccri.stealth.servlet

import com.ccri.stealth.auth.PkiAuthenticationSupport
import com.typesafe.config.{ConfigRenderOptions, ConfigFactory}
import org.scalatra.ScalatraServlet
import org.scalatra.scalate.ScalateSupport
import org.slf4j.LoggerFactory
import spray.json._

class DefaultServlet extends ScalatraServlet
  with ScalateSupport
  with PkiAuthenticationSupport {
  val logger = LoggerFactory.getLogger(getClass)
  val conf = ConfigFactory.load().getConfig("stealth")

  get("/?") {
      redirect("/!")
  }

  get("/!") {
    val userCn = pkiAuth
    logger.info("Access Granted: " + userCn)

    contentType = "text/html; charset=UTF-8"
    response.setHeader("X-UA-Compatible", "IE=edge")
    ssp(
      "index",
      "userCn" -> userCn,
      "config" -> JsonParser(conf.root().withoutKey("private").render(
          ConfigRenderOptions.defaults()
            .setJson(true)
            .setComments(false)
            .setOriginComments(false)
      ))
    )
  }

  get("/browser.html") {
    contentType = "text/html; charset=UTF-8"
    ssp(
      "browser",
      "config" -> JsonParser(conf.root().withOnlyKey("app").render(
        ConfigRenderOptions.defaults()
          .setJson(true)
          .setComments(false)
          .setOriginComments(false)
      ))
    )
  }

  protected def pkiAuth = {
    val user = scentry.authenticate("Pki")
    if (conf.getValue("private.security.anonymous").unwrapped.asInstanceOf[Boolean]) {
      if (user.isEmpty) "Anonymous"
      else getCn(user.get.dn)
    } else {
      if (user.isEmpty) {
        logger.warn("Access Denied: Anonymous")
        halt(403, "Access Denied: Please use HTTPS and present a valid certificate")
      } else {
        if (conf.getValue("private.security.userDns").unwrapped.asInstanceOf[java.util.List[String]].contains(user.get.dn)) {
          getCn(user.get.dn)
        } else {
          logger.warn("Access Denied: " + user.get.dn)
          halt(403, "Access Denied: Contact administrator for access. Your DN is [" + user.get.dn + "]")
        }
      }
    }
  }

  protected def getCn(dn:String) = dn.split(",").find((rdn) => rdn.startsWith("CN=")).get.substring(3)
}
