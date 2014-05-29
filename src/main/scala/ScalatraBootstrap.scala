import com.typesafe.config.{ConfigFactory, ConfigRenderOptions}
import javax.servlet.ServletContext
import org.scalatra.scalate.ScalateSupport
import org.scalatra.{LifeCycle, ScalatraServlet}
import spray.json._

class DefaultServlet extends ScalatraServlet with ScalateSupport with DefaultJsonProtocol {
  val conf = ConfigFactory.load().getConfig("stealth")

  get("/") {
    contentType = "text/html; charset=UTF-8"
    response.setHeader("X-UA-Compatible", "IE=edge")
    ssp(
      "index",
      "config" -> JsonParser(conf.root().render(
          ConfigRenderOptions.defaults()
            .setJson(true)
            .setComments(false)
            .setOriginComments(false)
      ))
    )
  }
}

class ScalatraBootstrap extends LifeCycle {
  override def init(context: ServletContext) {
    context.mount(new DefaultServlet, "/", "stealth")
  }
}
