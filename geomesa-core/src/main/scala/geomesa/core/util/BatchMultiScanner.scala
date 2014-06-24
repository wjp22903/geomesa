package geomesa.core.util

import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

import com.google.common.collect.{Lists, Queues}
import com.typesafe.scalalogging.slf4j.Logging
import org.apache.accumulo.core.client.{BatchScanner, Scanner}
import org.apache.accumulo.core.data.{Key, Value, Range => AccRange}

import scala.collection.JavaConversions._
import scala.collection.mutable.ListBuffer

class BatchMultiScanner(in: Scanner,
                        out: BatchScanner,
                        joinFn: java.util.Map.Entry[Key, Value] => AccRange)
  extends Iterable[java.util.Map.Entry[Key, Value]] with Logging {

  type E = java.util.Map.Entry[Key, Value]
  val inExecutor  = Executors.newSingleThreadExecutor()
  val outExecutor = Executors.newSingleThreadExecutor()
  val inQ  = Queues.newLinkedBlockingQueue[AccRange]()
  val outQ = Queues.newArrayBlockingQueue[E](2048)
  var inDone = new AtomicBoolean(false)
  var outDone = new AtomicBoolean(false)

  inExecutor.submit(new Runnable {
    override def run(): Unit = {
      //in.iterator().foreach(inQ.put)
      val itr = in.iterator()
      while(itr.hasNext){
        inQ.add(joinFn(itr.next()))
      }
      in.close()
      inDone.set(true)
      if(!inQ.isEmpty) {
        logger.info(f"Found ${inQ.size}%d items in reverse index")
        sub
      }
      else {
        outDone.set(true)
      }
    }
  })

  def notDone = !inDone.get
  def inQNonEmpty = !inQ.isEmpty

  // TODO parallelize so we can read while consuming the incoming itr - currently this fails tests
  def sub = outExecutor.submit(new Runnable {
    override def run(): Unit = {
      // Todo can we not do a list buffer maybe with a fold
      val allRanges = new ListBuffer[AccRange]
      while(notDone || inQNonEmpty) {
        allRanges += inQ.take()
      }
      out.setRanges(allRanges)
      outDone.set(true) // this must come before things are added to the outQ
      out.iterator().foreach(outQ.add)
      out.close()
    }
  })

  override def iterator: Iterator[java.util.Map.Entry[Key, Value]] = new Iterator[E] {
    override def hasNext: Boolean = {
      val ret = !(outDone.get && outQ.isEmpty)
      if(!ret) {
        inExecutor.shutdownNow()
        outExecutor.shutdownNow()
      }
      ret
    }

    override def next(): E = outQ.take()
  }
}
