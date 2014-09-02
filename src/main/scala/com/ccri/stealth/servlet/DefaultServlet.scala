package com.ccri.stealth.servlet

import com.ccri.stealth.auth.PkiAuthenticationSupport
import com.ccri.whiptail.tracker.{DiscoverableStyle, DiscoverableDetails}
import com.typesafe.config.{ConfigRenderOptions, ConfigFactory}
import org.apache.curator.framework.CuratorFrameworkFactory
import org.apache.curator.retry.ExponentialBackoffRetry
import org.apache.curator.x.discovery.ServiceDiscoveryBuilder
import org.apache.curator.x.discovery.details.JsonInstanceSerializer
import org.scalatra.ScalatraServlet
import org.scalatra.scalate.ScalateSupport
import org.slf4j.LoggerFactory
import spray.json._

trait DiscovererConfig {
  def zookeepers: String
  def basePath: String
}

trait DefaultServlet extends ScalatraServlet
  with ScalateSupport
  with PkiAuthenticationSupport
  with DiscovererConfig {
  val logger = LoggerFactory.getLogger(getClass)
  val conf = ConfigFactory.load().getConfig("stealth")
  val activeTabs = conf.getConfig("app").getStringList("tabs")
  val discoverer =
    if (activeTabs.contains("airDomain"))
      startServiceDiscovery()
    else
      null

  get("/") {
    val userCn = pkiAuth
    logger.info("Access Granted: " + userCn)

    contentType = "text/html; charset=UTF-8"
    response.setHeader("X-UA-Compatible", "IE=edge")
    ssp(
      "index",
      "userCn" -> userCn,
      "trackStyles" -> styles,
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

  protected def startServiceDiscovery() = {
    val zkClient = CuratorFrameworkFactory.newClient(zookeepers, new ExponentialBackoffRetry(1000, 3))
    zkClient.start()
    val serializer = new JsonInstanceSerializer[DiscoverableDetails](classOf[DiscoverableDetails])
    val discoverer =
      ServiceDiscoveryBuilder.builder[DiscoverableDetails](classOf[DiscoverableDetails])
        .client(zkClient)
        .basePath(basePath)
        .serializer(serializer)
        .build()
    discoverer.start()
    discoverer
  }

  protected def styles = {
    if (activeTabs.contains("airDomain")) {
      import collection.JavaConversions._
      import com.ccri.stealth.servlet.DiscoverableStyleJsonProtocol._

      val names = discoverer.queryForNames().toList
      val instances = names.flatMap(discoverer.queryForInstances)
      instances.map(_.getPayload.asInstanceOf[DiscoverableStyle]).toJson
    }
    else
      JsObject()
  }
}
