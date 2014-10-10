import akka.actor.ActorDSL._
import akka.actor.{ActorRef, Props, Actor}
import akka.routing.ConsistentHashingRouter
import akka.routing.ConsistentHashingRouter.ConsistentHashMapping
import com.ccri.stealth.servlet.KafkaConfig
import com.google.common.cache._
import com.google.gson.{JsonObject, JsonParser}
import java.util.Properties
import java.util.concurrent.{TimeUnit, Executors}
import kafka.consumer.{Whitelist, ConsumerConfig, Consumer}
import kafka.message.MessageAndMetadata
import kafka.serializer.StringDecoder
import org.json4s.{Formats, DefaultFormats}
import org.scalatra.ScalatraServlet
import org.scalatra.atmosphere._
import org.scalatra.json.JacksonJsonSupport
import org.slf4j.LoggerFactory
import scala.concurrent.duration.Duration
import scala.Some
import scala.util.{Failure, Success, Try}


sealed case class JOEvent(id: String, o: JsonObject)
sealed case class JOListEvent(id: String, o: List[JsonObject])
sealed case class TMEvent(id: String, t: TextMessage)
sealed case class SendRemoveMessage(id: String, o: JsonObject)
object CleanUp
private object Parser {
  val jsonParser = new JsonParser
  def parse(jsonStr: String) = jsonParser.parse(jsonStr)
}

trait TrackController
  extends ScalatraServlet
  with JacksonJsonSupport
  with AtmosphereSupport
  with KafkaConfig {

  implicit protected val jsonFormats: Formats = DefaultFormats

  val logger = LoggerFactory.getLogger(classOf[TrackController])

  import scala.concurrent.ExecutionContext.Implicits.global

  atmosphere("/realtime") {
    new AtmosphereClient {
      override def receive = {
        case Connected          => logger.info("Connected")
        case Disconnected(_, _) => logger.info("Disconnected")
        case Error(Some(error)) => logger.info(s"Error: $error")
//        case TextMessage(text)  => send("ECHO: " + text)
//        case JsonMessage(json)  => broadcast(json)
      }
    }
  }

  val kafkaProps = new Properties()
  kafkaProps.put("zookeeper.connect", zookeepers)
  kafkaProps.put("group.id", "ui")
  kafkaProps.put("zookeeper.session.timeout.ms", "1000")
  kafkaProps.put("zookeeper.sync.time.ms", "500")
  kafkaProps.put("auto.commit.interval.ms", "1000")

  val kafkaExecutor = Executors.newSingleThreadExecutor()
  override def initialize(config: TrackController#ConfigT): Unit = {
    super.initialize(config)


    val broadcastActor = actor(new Act {
      override def receive = {
        case TMEvent(id, t) => {
          val path = s"$contextPath/tracks/realtime"
          logger.trace(s"Broadcasting: $t to '$path'")
          AtmosphereClient.broadcast(path, t)
        }
      }
    })

    def hashById: ConsistentHashMapping = {
      case JOEvent(id, _) => id
      case JOListEvent(id, _) => id
      case TMEvent(id, _) => id
      case SendRemoveMessage(id, _) => id
    }

    val router = ConsistentHashingRouter(10, hashMapping = hashById)

    val encodingActorProps = Props(new EncodingActor(broadcastActor))
    val encodingActor = scalatraActorSystem.actorOf(encodingActorProps.withRouter(router))

    val throttlingActorProps = Props(new ThrottlingActor(encodingActor, 5))
    val throttlingActor = scalatraActorSystem.actorOf(throttlingActorProps.withRouter(router))

    val cachingActorProps = Props(new CachingActor(throttlingActor))
    val cachingActor = scalatraActorSystem.actorOf(cachingActorProps.withRouter(router))

    val consumer = buildMessageConsumer(cachingActor)
    kafkaExecutor.submit(consumer)
  }

  private def buildMessageConsumer(actor: ActorRef) = {
    val kafkaConsumer = Consumer.create(new ConsumerConfig(kafkaProps))
    val whitelistTopicFilter = new Whitelist(topicsRegex)
    val decoder = new StringDecoder
    val numStreams = 1
    val inStream =
      kafkaConsumer
        .createMessageStreamsByFilter(whitelistTopicFilter, numStreams, decoder, decoder)
        .head

    val processor = new Runnable {
      override def run(): Unit = {
        val s = inStream.iterator()
        while (s.hasNext()) {
          val MessageAndMetadata(_, msg, _, _, _) = s.next()
          send(actor, msg)
        }
      }
    }
    processor
  }

  private def send(actor: ActorRef, msg: String) = {
    val o = Parser.parse(msg).getAsJsonObject
    Try(o.get("id")) match {
      case Success(id) => actor ! JOEvent(id.getAsString, o)
      case Failure(e) => e.printStackTrace()
    }
  }
}

sealed case class Coordinate(lon: Double, lat: Double) {
  override def toString = s"[$lon, $lat]"
}

trait CoordinateUtils {

  def getCoordinates(points: List[JsonObject]) = {
    val coordsList = points.map { p =>
      val geom = Try(p.get("geometry").getAsJsonObject)
      val coord = geom.map(g => g.get("coordinates").getAsJsonArray)
      val coordinate = coord.map { c =>
        new Coordinate(c.get(0).getAsDouble, c.get(1).getAsDouble)
      }
      coordinate
    }
    coordsList
  }
}

class CachingActor(next: ActorRef) extends Actor with CoordinateUtils {
  val logger = LoggerFactory.getLogger(classOf[CachingActor])

  import scala.concurrent.ExecutionContext.Implicits.global
  // Schedule a clean-up event to be sent continuously every interval.
  val initialDelay = Duration(15, TimeUnit.SECONDS)
  val interval = Duration(15, TimeUnit.SECONDS)
  context.system.scheduler
    .schedule(initialDelay, interval, self, CleanUp)

  import collection.mutable.ListBuffer
  val loader = new CacheLoader[String, ListBuffer[JsonObject]] {
    // Loads new buffer into cache if one doesn't exist for key 'k'.
    override def load(k: String) = ListBuffer[JsonObject]()
  }

  val listener = new RemovalListener[String, ListBuffer[JsonObject]] {
    override def onRemoval(notification: RemovalNotification[String, ListBuffer[JsonObject]]) = {
      if (notification.getCause.equals(RemovalCause.EXPIRED)) {
        val id = notification.getKey
        val firstPoint = notification.getValue.head
        next ! SendRemoveMessage(id, firstPoint)
      }
    }
  }

  val cache =
    CacheBuilder.newBuilder()
      .expireAfterWrite(120, TimeUnit.SECONDS)
      .removalListener(listener)
      .build(loader)

  override def receive = {
    case JOEvent(id, point) =>
      val points = cache.get(id)
      // Ignore points with the same coordinates as the last seen point
      if (points.size > 0) {
        val hd = points.head
        val List(cur, next) = getCoordinates(List(hd, point)).map(_.get)
        if (cur != next) {
          points.prepend(point)
        }
      } else {
        points.prepend(point)
      }
      val size = points.size
      if (size > 21)
        points.trimEnd(size - 21)
      cache.put(id, points)
      next ! JOListEvent(id, points.toList)

    case CleanUp => cache.cleanUp()
  }

}


class ThrottlingActor(next: ActorRef, throttlingParam: Integer) extends Actor {
  val logger = LoggerFactory.getLogger(classOf[ThrottlingActor])

  import scala.concurrent.ExecutionContext.Implicits.global
  // Schedule a clean-up event to be sent continuously every interval.
  val initialDelay = Duration(15, TimeUnit.SECONDS)
  val interval = Duration(15, TimeUnit.SECONDS)
  context.system.scheduler
    .schedule(initialDelay, interval, self, CleanUp)

  val countsById =
    CacheBuilder.newBuilder()
      .expireAfterWrite(60, TimeUnit.SECONDS)
      .build[String, Integer](
        new CacheLoader[String, Integer] {
          // Initializes the count if one doesn't exist for 'id'.
          override def load(id: String): Integer = 1
        }
      )

  override def receive = {
    case evt@JOListEvent(id, points) =>
      val count = countsById.get(id)
      if (count % throttlingParam == 0) {
        countsById.put(id, 1) // Reset the count.
        next ! evt // Pass on the list of points.
      } else {
        countsById.put(id, count + 1) // Update the count.
      }

    case m@SendRemoveMessage(_, _) => next ! m

    case CleanUp => countsById.cleanUp()
  }
}

class EncodingActor(emitter: ActorRef) extends Actor with CoordinateUtils {
  val logger = LoggerFactory.getLogger(classOf[EncodingActor])

  override def receive = {
    case JOListEvent(id, points) =>
      if (points.size > 2) {
        val coords = getCoordinates(points)
        val props = getProperties(points.head)
        val ls = buildLineString(coords, props)
        logger.trace(s"Encoded message: $ls")
        emitter ! TMEvent(id, TextMessage(ls))
      }

    case SendRemoveMessage(id, o) =>
      val props = getProperties(o)
      val hexid = props.map(p => p.get("hexid").getAsString).getOrElse("")
      val removeMsg = s"""{"remove":"$hexid"}"""
      logger.trace(s"Encoded message: $removeMsg")
      emitter ! TMEvent(id, TextMessage(removeMsg))
  }

  def getProperties(point: JsonObject) = Try(point.get("properties").getAsJsonObject)

  def buildLineString(coords: List[Try[Coordinate]], props: Try[JsonObject]) = {
    val coordsStr = coords.map { c => c.map(_.toString).getOrElse("") }.mkString("[", ",", "]")
    val propsStr = props.map(p => p.toString).getOrElse("{}")
    s"""
       | { "type": "Feature",
       |   "geometry": {
       |       "type": "LineString",
       |       "coordinates": $coordsStr
       |   },
       |   "properties": $propsStr
       | }
     """.stripMargin.replaceAll("\n", "").replaceAll(" ", "")
  }
}
