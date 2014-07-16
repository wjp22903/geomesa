package com.ccri.stealth.servlet

import akka.actor.ActorDSL._
import akka.actor.{ActorRef, Props, Actor}
import akka.routing.ConsistentHashingRouter.ConsistentHashMapping
import akka.routing.{RoundRobinRouter, ConsistentHashingRouter}
import com.google.gson.JsonParser
import java.util.Properties
import java.util.concurrent.Executors
import kafka.consumer.{Whitelist, ConsumerConfig, Consumer}
import kafka.message.MessageAndMetadata
import kafka.serializer.StringDecoder
import org.json4s.{Formats, DefaultFormats}
import org.scalatra.ScalatraServlet
import org.scalatra.atmosphere._
import org.scalatra.json.JacksonJsonSupport
import org.slf4j.LoggerFactory
import scala.concurrent.ExecutionContext
import scala.util.Try

trait KafkaConfig {
  def zookeepers:   String
  def topicsRegex:  String
}

trait TrackController
  extends ScalatraServlet
  with JacksonJsonSupport
  with AtmosphereSupport
  with KafkaConfig {

  implicit protected val jsonFormats: Formats = DefaultFormats

  val logger = LoggerFactory.getLogger(classOf[TrackController])

  import ExecutionContext.Implicits.global

  atmosphere("/realtime") {
    new AtmosphereClient {
      override def receive = {
        case Connected          => logger.info("Connected")
        case Disconnected(_, _) => logger.info("Disconnected")
        case Error(Some(error)) => logger.info(s"Error: $error")
        case TextMessage(text)  => send("ECHO: " + text)
        case JsonMessage(json)  => broadcast(json)
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


    def hashByTrackId: ConsistentHashMapping = {
      case (tId, _) => tId
    }

    val broadcastActor = actor(new Act {
      override def receive = {
        case tm@TextMessage(msg) =>
          logger.trace(s"Sending $msg")
          AtmosphereClient.broadcast("/tracks/realtime", tm)
      }
    })

    val throttlingActor = scalatraActorSystem.actorOf(Props( new ThrottlingActor(broadcastActor)).withRouter(ConsistentHashingRouter(10, hashMapping = hashByTrackId)))

    val parsingActor = scalatraActorSystem.actorOf(Props(new ParsingActor(throttlingActor)).withRouter(RoundRobinRouter(10)))

    val trackConsumer = Consumer.create(new ConsumerConfig(kafkaProps))
    val filter = new Whitelist(topicsRegex)
    val strDecoder = new StringDecoder
    val stream = trackConsumer.createMessageStreamsByFilter(filter, 1, strDecoder, strDecoder).head
    val messageProcessor = new Runnable {
      override def run(): Unit = {
        val iter = stream.iterator()
        while (iter.hasNext()) {
          val MessageAndMetadata(_, msg, _, _, _) = iter.next()
          parsingActor ! msg
        }
      }
    }
    kafkaExecutor.submit(messageProcessor)
  }
}

class ParsingActor(throttlingActor: ActorRef) extends Actor {
  val io = new JsonParser

  override def receive = {
    case msg: String =>
      val d = io.parse(msg).getAsJsonObject
      val tId = Try(d.get("properties").getAsJsonObject.get("trackId").getAsString).getOrElse(d.get("remove").getAsString)
      throttlingActor ! (tId, TextMessage(msg))
  }
}

class ThrottlingActor(next: ActorRef) extends Actor {
  val logger = LoggerFactory.getLogger(classOf[ThrottlingActor])
  val trackMap = collection.mutable.HashMap[String, Int]()

  override def receive = {
    case (trkId: String, t@TextMessage(msg)) =>
      val count = trackMap.getOrElse(trkId, 1)
      if(count % 20 == 0 || msg.contains("remove")) {
        trackMap.remove(trkId)
        next ! t
      } else {
        trackMap.put(trkId, count+1)
      }

    case js@JsonMessage(msg) =>
      logger.trace(s"Sending $msg")
  }
}
