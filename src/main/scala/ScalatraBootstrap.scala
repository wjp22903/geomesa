import com.ccri.stealth.servlet._
import com.typesafe.config.ConfigFactory
import javax.servlet.ServletContext
import org.scalatra.LifeCycle

class ScalatraBootstrap extends LifeCycle {
  val conf = ConfigFactory.load().getConfig("stealth")
  val appConf = conf.getConfig("app")
  val activeTabs = appConf.getStringList("tabs")
  val kafkaConf = conf.getConfig("kafka")
  val airTrackerConf = conf.getConfig("airTracker")

  val stylesFallback =
    """
      | styles: {
      |   zookeepers:         "zookeeper"
      |   basePath:           "/trackers"
      | }
    """.stripMargin

  val airTrackerStylesConf =
    if (airTrackerConf.hasPath("styles"))
      airTrackerConf.getConfig("styles")
    else
      ConfigFactory.parseString(stylesFallback).getConfig("styles")

  trait StylesConfig extends DiscovererConfig {
    override def zookeepers  = airTrackerStylesConf.getString("zookeepers")
    override def basePath    = airTrackerStylesConf.getString("basePath")
  }

  trait TrackConfig extends KafkaConfig {
    override def topicsRegex = kafkaConf.getString("topicsRegex")
    override def zookeepers  = kafkaConf.getString("zookeepers")
  }

  override def init(context: ServletContext) {
    context.mount(new DefaultServlet with StylesConfig, "/")
    if (activeTabs.contains("airDomain"))
      context.mount(new TrackController with TrackConfig, "/tracks")
  }
}
