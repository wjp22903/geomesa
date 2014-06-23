package geomesa.core.util

import java.util.concurrent.Executors

import com.google.common.collect.{Lists, Queues}
import org.apache.accumulo.core.client.{BatchScanner, Scanner}
import org.apache.accumulo.core.data.{Key, Value, Range => AccRange}

import scala.collection.JavaConversions._

class BatchMultiScanner(in: Scanner,
                        out: BatchScanner,
                        joinFn: java.util.Map.Entry[Key, Value] => AccRange)
  extends Iterable[java.util.Map.Entry[Key, Value]] {

  type E = java.util.Map.Entry[Key, Value]
  val inExecutor  = Executors.newSingleThreadExecutor()
  val outExecutor = Executors.newSingleThreadExecutor()
  val inQ  = Queues.newArrayBlockingQueue[E](2048)
  val outQ = Queues.newArrayBlockingQueue[E](2048)
  var done = false

  inExecutor.submit(new Runnable {
    override def run(): Unit = {
      in.iterator().foreach(inQ.put)
      done = true
    }
  })

  outExecutor.submit(new Runnable {
    override def run(): Unit = {
      while(!done) {
        // block until data is ready
        val e = inQ.take()
        val batch = Lists.newLinkedList[E]()
        val count = inQ.drainTo(batch)
        val ranges = batch.take(count).map(e => joinFn(e))
        out.setRanges(ranges)
        out.iterator().foreach(outQ.put)
      }
    }
  })

  override def iterator: Iterator[java.util.Map.Entry[Key, Value]] = new Iterator[E] {
    override def hasNext: Boolean = {
      val ret = inQ.isEmpty && outQ.isEmpty && done
      if(!ret) {
        inExecutor.shutdownNow()
        outExecutor.shutdownNow()
      }
      ret
    }

    override def next(): E = outQ.take()
  }
}
