import com.ccri.stealth.servlet._
import javax.servlet.ServletContext
import org.scalatra.LifeCycle

class ScalatraBootstrap extends LifeCycle {
  override def init(context: ServletContext) {
    context.mount(new DefaultServlet(context.contextPath.substring(1)), "/", "stealth")
  }
}
