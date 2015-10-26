package com.ccri.stealth.servlet

import java.util.Date

import com.ccri.stealth.config.TypesafeConfig
import com.ccri.stealth.plugin.JmxUtils
import com.typesafe.config.{ConfigRenderOptions, ConfigFactory}
import org.fusesource.scalate.util.IOUtil
import org.scalatra.ScalatraServlet
import org.scalatra.scalate.ScalateSupport
import org.scalatra.util.DateUtil
import org.slf4j.LoggerFactory
import org.springframework.security.core.Authentication
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.userdetails.UserDetails
import scala.collection.JavaConversions._
import spray.json._

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
      case details: UserDetails => Option(details.getUsername)
      case userString: String => Option(userString)
      case _ => None // shouldn't happen
    }

  /** get the CN if present, otherwise return input string */
  def getCNOrAll(dn:String) : String =
    if(dn.contains("CN=")) dn.split(",").find(s => s.startsWith("CN=")).get.substring(3)
    else dn
}

class DefaultServlet(appContext: String) extends ScalatraServlet with ScalateSupport {
  val logger = LoggerFactory.getLogger(getClass)
  val conf = TypesafeConfig.get(appContext)
  val unknownUser = "Unknown User"

  get("/?") {
    redirect("/!")
  }

  get("/!") {
    val beanNames = JmxUtils.getBeanNames
    val plugins = conf.getStringList("private.plugins").toList.:::(JmxUtils.getPlugins(beanNames).toList)
      .distinct.map(plugin => {"'" + plugin.replaceAll("['\"]", "") + "'"})
    def buildResponse(user: String)  = {
      logger.info("Access Granted: " + user)
      contentType = "text/html; charset=UTF-8"
      response.setHeader("X-UA-Compatible", "IE=edge")
      ssp(
        "index",
        "userCn" -> DefaultServlet.getCNOrAll(user),
        "userDn" -> user,
        "datetime" -> DateUtil.formatDate(new Date(), "yyyyMMDDHHmm"),
        "jmxCss" -> JmxUtils.getCss(beanNames).toList,
        "jmxJs" -> JmxUtils.getJs(beanNames).toList,
        "plugins" -> plugins,
        "config" -> JsonParser(conf.root().withoutKey("private").render(
          ConfigRenderOptions.defaults()
            .setJson(true)
            .setComments(false)
            .setOriginComments(false)
        ))
      )
    }
    // if we have a user, build response, otherwise redirect
    DefaultServlet.getUser.fold(redirect(conf.getString("private.security.accessDeniedUrl")))(buildResponse)
  }

  get("/:file.html") {
    def buildResponse(user: String)  = {
      findTemplate(requestPath) map { path =>
        contentType = "text/html; charset=UTF-8"
        response.setHeader("X-UA-Compatible", "IE=edge")
        ssp(
          path,
          "userCn" -> DefaultServlet.getCNOrAll(user),
          "userDn" -> user,
          "config" -> JsonParser(conf.root().withOnlyKey("app").render(
            ConfigRenderOptions.defaults()
              .setJson(true)
              .setComments(false)
              .setOriginComments(false)
          ))
        )
      } orElse serveStaticResource() getOrElse resourceNotFound()
    }
    buildResponse(DefaultServlet.getUser.getOrElse(unknownUser))
  }

  get("/webjars/*") {
    def buildResponse(user: String)  = {
      val resourcePath = "/META-INF/resources/webjars/" + params("splat")
      Option(getClass.getResourceAsStream(resourcePath)) match {
        case Some(inputStream) => {
          if (templateEngine.extensions.contains(resourcePath.split("\\.").last)) {
            contentType = "text/html; charset=UTF-8"
            response.setHeader("X-UA-Compatible", "IE=edge")
            layoutTemplate(
              resourcePath,
              "userCn" -> DefaultServlet.getCNOrAll(user),
              "userDn" -> user,
              "config" -> JsonParser(conf.root().withOnlyKey("app").render(
                ConfigRenderOptions.defaults()
                  .setJson(true)
                  .setComments(false)
                  .setOriginComments(false)
              ))
            )
          } else {
            contentType = servletContext.getMimeType(resourcePath)
            IOUtil.loadBytes(inputStream)
          }
        }
        case None => resourceNotFound()
      }
    }
    buildResponse(DefaultServlet.getUser.getOrElse(unknownUser))
  }
}
