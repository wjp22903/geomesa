package com.ccri.stealth.servlet

import com.typesafe.config.{ConfigRenderOptions, ConfigFactory}
import org.scalatra.ScalatraServlet
import org.scalatra.scalate.ScalateSupport
import org.slf4j.LoggerFactory
import org.springframework.security.core.Authentication
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.userdetails.UserDetails
import spray.json._

class DefaultServlet(appContext: String) extends ScalatraServlet with ScalateSupport {
  val logger = LoggerFactory.getLogger(getClass)
  val rootConf = ConfigFactory.load()
  val conf =
    if (rootConf.hasPath(appContext))
      rootConf.getConfig(appContext).withFallback(rootConf.getConfig("stealth"))
    else
      rootConf.getConfig("stealth")

  get("/?") {
    redirect("/!")
  }

  get("/!") {
    def buildResponse(user: String)  = {
      logger.info("Access Granted: " + user)
      contentType = "text/html; charset=UTF-8"
      response.setHeader("X-UA-Compatible", "IE=edge")
      ssp(
        "index",
        "userCn" -> user,
        "config" -> JsonParser(conf.root().withoutKey("private").render(
          ConfigRenderOptions.defaults()
            .setJson(true)
            .setComments(false)
            .setOriginComments(false)
        ))
      )
    }
    // if we have a user, build response, otherwise redirect
    DefaultServlet.getUser.fold(redirect("/access.html"))(buildResponse)
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

  get("/access.html") {
    <html>
      <body>
        <h2>User has insufficient privileges to access this page</h2>
      </body>
    </html>
  }
}

object DefaultServlet {
  /** get the user from the security context */
  def getUser: Option[String] = for {
      context <- Option(SecurityContextHolder.getContext) // shouldn't ever be null, but check it anyway
      auth <- Option(context.getAuthentication) // might be null
      user <- DefaultServlet.parseAuth(auth)
    } yield user

  /** parse the auth object to get the username from UserDetails or a String */
  def parseAuth(auth: Authentication): Option[String] =
    auth.getPrincipal match {
      case details: UserDetails => Option(DefaultServlet.getCNOrAll(details.getUsername))
      case userString: String => Option(userString)
      case _ => None // shouldn't happen
    }

  /** get the CN if present, otherwise return input string */
  def getCNOrAll(dn:String) : String =
    if(dn.contains("CN=")) dn.split(",").find(s => s.startsWith("CN=")).get.substring(3)
    else dn
}

