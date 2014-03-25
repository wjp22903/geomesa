import javax.servlet.ServletContext
import org.scalatra.scalate.ScalateSupport
import org.scalatra.{LifeCycle, ScalatraServlet}

/**
 * Created by mforkin on 3/25/14.
 */
class DefaultServlet extends ScalatraServlet with ScalateSupport {
  get("/") {
    contentType = "text/html; charset=UTF-8"
    response.setHeader("X-UA-Compatible", "IE=edge")
    ssp(
      "index"
    )
  }
}

class ScalatraBootstrap extends LifeCycle {
  override def init(context: ServletContext) {
    context.mount(new DefaultServlet, "/", "darwin")
  }
}
