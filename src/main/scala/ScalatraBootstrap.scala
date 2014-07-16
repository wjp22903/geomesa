import com.ccri.stealth.servlet.{DiscovererConfig, DefaultServlet, KafkaConfig, TrackController}
import com.typesafe.config.ConfigFactory
import javax.servlet.ServletContext
import org.scalatra.LifeCycle

class ScalatraBootstrap extends LifeCycle {
  val conf      = ConfigFactory.load().getConfig("stealth")
  val kafkaConf = conf.getConfig("kafka")
  val trackerStylesConf = conf.getConfig("trackerStyles")

  trait StylesConfig extends DiscovererConfig {
    override def zookeepers  = trackerStylesConf.getString("zookeepers")
    override def basePath    = trackerStylesConf.getString("basePath")
  }

  trait TrackConfig extends KafkaConfig {
    override def topicsRegex = kafkaConf.getString("topicsRegex")
    override def zookeepers  = kafkaConf.getString("zookeepers")
  }

  override def init(context: ServletContext) {
    context.mount(new DefaultServlet with StylesConfig, "/")
    context.mount(new TrackController with TrackConfig, "/tracks")
  }
}
