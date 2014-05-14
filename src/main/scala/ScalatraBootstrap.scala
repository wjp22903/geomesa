import com.ccri.stealth.web.MapAPI
import javax.servlet.ServletContext
import org.scalatra.scalate.ScalateSupport
import org.scalatra.{LifeCycle, ScalatraServlet}

class DefaultServlet extends ScalatraServlet with ScalateSupport {
  get("/") {
    contentType = "text/html; charset=UTF-8"
    response.setHeader("X-UA-Compatible", "IE=edge")
    ssp(
      "index"
    )
  }

  get("/sandbox") {
    contentType = "text/html; charset=UTF-8"
    response.setHeader("X-UA-Compatible", "IE=edge")
    ssp(
      "sandbox"
    )
  }
}

class ScalatraBootstrap extends LifeCycle {
  override def init(context: ServletContext) {
    context.mount(new DefaultServlet, "/", "stealth")
    context.mount(new MapAPI, "/mapservice", "stealth/mapservice")
  }
}
