package org.locationtech.geomesa.core.index

import java.util.Map.Entry

import com.vividsolutions.jts.geom.{Polygon, GeometryCollection, Geometry}
import org.apache.accumulo.core.client.{IteratorSetting, BatchScanner}
import org.apache.accumulo.core.data.{Value, Key}
import org.apache.accumulo.core.iterators.user.RegExFilter
import org.geotools.data.Query
import org.geotools.filter.text.ecql.ECQL
import org.locationtech.geomesa.core._
import org.locationtech.geomesa.core.data._
import org.locationtech.geomesa.core.filter._
import org.locationtech.geomesa.core.index.FilterHelper._
import org.locationtech.geomesa.core.index.QueryHints._
import org.locationtech.geomesa.core.iterators._
import org.locationtech.geomesa.core.util.{SelfClosingBatchScanner, SelfClosingIterator}
import org.locationtech.geomesa.utils.geotools.SimpleFeatureTypes
import org.opengis.feature.simple.SimpleFeatureType
import org.opengis.filter.Filter
import org.opengis.filter.expression.Literal
import org.opengis.filter.spatial.{BinarySpatialOperator, BBOX}
import scala.collection.JavaConversions._
import scala.util.Random
import IndexQueryPlanner._

import java.nio.charset.StandardCharsets
import java.util.Map.Entry
import com.typesafe.scalalogging.slf4j.Logging

import com.vividsolutions.jts.geom._
import org.apache.accumulo.core.client.{BatchScanner, IteratorSetting, Scanner}
import org.apache.accumulo.core.data.{Key, Value, Range => AccRange}
import org.apache.accumulo.core.iterators.user.RegExFilter
import org.apache.hadoop.io.Text
import org.geotools.data.{DataUtilities, Query}
import org.geotools.factory.CommonFactoryFinder
import org.geotools.filter.text.ecql.ECQL
import org.geotools.geometry.jts.ReferencedEnvelope
import org.joda.time.Interval
import org.locationtech.geomesa.core._
import org.locationtech.geomesa.core.data._
import org.locationtech.geomesa.core.filter._
import org.locationtech.geomesa.core.index.IndexQueryPlanner._
import org.locationtech.geomesa.core.index.FilterHelper._
import org.locationtech.geomesa.core.index.QueryHints._
import org.locationtech.geomesa.core.iterators.{FEATURE_ENCODING, _}
import org.locationtech.geomesa.core.util.CloseableIterator._
import org.locationtech.geomesa.core.util.{BatchMultiScanner, CloseableIterator, SelfClosingBatchScanner, SelfClosingIterator}
import org.locationtech.geomesa.utils.geohash.GeohashUtils._
import org.locationtech.geomesa.utils.geotools.Conversions._
import org.locationtech.geomesa.utils.geotools.{GeometryUtils, SimpleFeatureTypes}
import org.opengis.feature.simple.SimpleFeatureType
import org.opengis.filter._
import org.opengis.filter.expression.{Literal, PropertyName}
import org.opengis.filter.spatial._

import scala.collection.JavaConversions._
import scala.util.Random

trait Strategy {
  def iqp: IndexQueryPlanner

  def featureEncoder: SimpleFeatureEncoder = iqp.featureEncoder
  def schema: String                       = iqp.schema
  def cfPlanner: ColumnFamilyPlanner       = iqp.cfPlanner
  def keyPlanner: KeyPlanner               = iqp.keyPlanner

  def execute(acc: AccumuloConnectorCreator,
                     featureType: SimpleFeatureType,
                     query: Query,
                     filterVisitor: FilterToAccumulo,
                     output: ExplainerOutputType): SelfClosingIterator[Entry[Key, Value]]

  def configureBatchScanner(bs: BatchScanner, qp: QueryPlan): Unit = {
    qp.iterators.foreach { i => bs.addScanIterator(i) }
    bs.setRanges(qp.ranges)
    qp.cf.foreach { c => bs.fetchColumnFamily(c) }
  }


  def configureFeatureEncoding(cfg: IteratorSetting) =
    cfg.addOption(FEATURE_ENCODING, featureEncoder.getName)

  def configureFeatureType(cfg: IteratorSetting, featureType: SimpleFeatureType) {
    val encodedSimpleFeatureType = SimpleFeatureTypes.encodeType(featureType)
    cfg.addOption(GEOMESA_ITERATORS_SIMPLE_FEATURE_TYPE, encodedSimpleFeatureType)
    cfg.encodeUserData(featureType.getUserData, GEOMESA_ITERATORS_SIMPLE_FEATURE_TYPE)
  }

  // returns the SimpleFeatureType for the query's transform
  def transformedSimpleFeatureType(query: Query): Option[SimpleFeatureType] = {
    Option(query.getHints.get(TRANSFORM_SCHEMA)).map {_.asInstanceOf[SimpleFeatureType]}
  }

  // store transform information into an Iterator's settings
  def configureTransforms(query:Query,cfg: IteratorSetting) =
    for {
      transformOpt  <- Option(query.getHints.get(TRANSFORMS))
      transform     = transformOpt.asInstanceOf[String]
      _             = cfg.addOption(GEOMESA_ITERATORS_TRANSFORM, transform)
      sfType        <- transformedSimpleFeatureType(query)
      encodedSFType = SimpleFeatureTypes.encodeType(sfType)
      _             = cfg.addOption(GEOMESA_ITERATORS_TRANSFORM_SCHEMA, encodedSFType)
    } yield Unit

  // establishes the regular expression that defines (minimally) acceptable rows
  def configureRowRegexIterator(regex: String): IteratorSetting = {
    val name = "regexRow-" + randomPrintableString(5)
    val cfg = new IteratorSetting(iteratorPriority_RowRegex, name, classOf[RegExFilter])
    RegExFilter.setRegexs(cfg, regex, null, null, null, false)
    cfg
  }

  // returns an iterator over [key,value] pairs where the key is taken from the index row and the value is a SimpleFeature,
  // which is either read directory from the data row  value or generated from the encoded index row value
  // -- for items that either:
  // 1) the GeoHash-box intersects the query polygon; this is a coarse-grained filter
  // 2) the DateTime intersects the query interval; this is a coarse-grained filter
  def configureIndexIterator(filter: Option[Filter],
                             query: Query,
                             featureType: SimpleFeatureType): IteratorSetting = {
    val cfg = new IteratorSetting(iteratorPriority_SpatioTemporalIterator,
      "within-" + randomPrintableString(5),classOf[IndexIterator])
    IndexIterator.setOptions(cfg, schema, filter)
    configureFeatureType(cfg, featureType)
    configureFeatureEncoding(cfg)
    cfg
  }

  // returns only the data entries -- no index entries -- for items that either:
  // 1) the GeoHash-box intersects the query polygon; this is a coarse-grained filter
  // 2) the DateTime intersects the query interval; this is a coarse-grained filter
  def configureSpatioTemporalIntersectingIterator(filter: Option[Filter],
                                                  featureType: SimpleFeatureType,
                                                  isDensity: Boolean): IteratorSetting = {
    val cfg = new IteratorSetting(iteratorPriority_SpatioTemporalIterator,
      "within-" + randomPrintableString(5),
      classOf[SpatioTemporalIntersectingIterator])
    SpatioTemporalIntersectingIterator.setOptions(cfg, schema, filter)
    configureFeatureType(cfg, featureType)
    if (isDensity) cfg.addOption(GEOMESA_ITERATORS_IS_DENSITY_TYPE, "isDensity")
    cfg
  }

  // assumes that it receives an iterator over data-only entries, and aggregates
  // the values into a map of attribute, value pairs
  def configureSimpleFeatureFilteringIterator(simpleFeatureType: SimpleFeatureType,
                                              ecql: Option[String],
                                              query: Query): IteratorSetting = {

    val density: Boolean = query.getHints.containsKey(DENSITY_KEY)

    val cfg = new IteratorSetting(iteratorPriority_SimpleFeatureFilteringIterator,
      "sffilter-" + randomPrintableString(5),
      classOf[SimpleFeatureFilteringIterator])

    cfg.addOption(DEFAULT_SCHEMA_NAME, schema)
    configureFeatureEncoding(cfg)
    configureTransforms(query,cfg)
    configureFeatureType(cfg, simpleFeatureType)
    ecql.foreach(SimpleFeatureFilteringIterator.setECQLFilter(cfg, _))

    cfg
  }

  def randomPrintableString(length:Int=5) : String = (1 to length).
    map(i => Random.nextPrintableChar()).mkString



}

class StIdxStrategy(val iqp: IndexQueryPlanner) extends Strategy with Logging {
  //override def execute(acc: AccumuloConnectorCreator, sft: SimpleFeatureType, derivedQuery: Query, isDensity: Boolean, output: ExplainerOutputType): SelfClosingIterator[Entry[Key, Value]] = ???

  def execute(acc: AccumuloConnectorCreator,
                       featureType: SimpleFeatureType,
                       query: Query,
                       filterVisitor: FilterToAccumulo,
                       output: ExplainerOutputType): SelfClosingIterator[Entry[Key, Value]] = {
    val bs = acc.createSTIdxScanner(featureType)
    val qp = buildSTIdxQueryPlan(query, filterVisitor, featureType, output)
    configureBatchScanner(bs, qp)
    // NB: Since we are (potentially) gluing multiple batch scanner iterators together,
    //  we wrap our calls in a SelfClosingBatchScanner.
    SelfClosingBatchScanner(bs)

  }

  def buildSTIdxQueryPlan(query: Query,
                          filterVisitor: FilterToAccumulo,
                          featureType: SimpleFeatureType,
                          output: ExplainerOutputType) = {
    output(s"Scanning ST index table for feature type ${featureType.getTypeName}")

    val spatial = filterVisitor.spatialPredicate
    val temporal = filterVisitor.temporalPredicate

    // TODO: Select only the geometry filters which involve the indexed geometry type.
    // https://geomesa.atlassian.net/browse/GEOMESA-200
    // Simiarly, we should only extract temporal filters for the index date field.
    val (geomFilters, otherFilters) = partitionGeom(query.getFilter)
    val (temporalFilters, ecqlFilters: Seq[Filter]) = partitionTemporal(otherFilters)

    val tweakedEcqlFilters = ecqlFilters.map(updateTopologicalFilters(_, featureType))

    val ecql = filterListAsAnd(tweakedEcqlFilters).map(ECQL.toCQL)

    output(s"The geom filters are $geomFilters.\nThe temporal filters are $temporalFilters.")

    val tweakedGeoms = geomFilters.map(updateTopologicalFilters(_, featureType))

    output(s"Tweaked geom filters are $tweakedGeoms")

    // standardize the two key query arguments:  polygon and date-range
    val geomsToCover = tweakedGeoms.flatMap {
      case bbox: BBOX =>
        val bboxPoly = bbox.getExpression2.asInstanceOf[Literal].evaluate(null, classOf[Geometry])
        Seq(bboxPoly)
      case gf: BinarySpatialOperator =>
        extractGeometry(gf)
      case _ => Seq()
    }

    val collectionToCover: Geometry = geomsToCover match {
      case Nil => null
      case seq: Seq[Geometry] => new GeometryCollection(geomsToCover.toArray, geomsToCover.head.getFactory)
    }

    val interval = netInterval(temporal)
    val geometryToCover = netGeom(collectionToCover)
    val filter = buildFilter(geometryToCover, interval)

    output(s"GeomsToCover $geomsToCover.")

    val ofilter = filterListAsAnd(geomFilters ++ temporalFilters)
    if(ofilter.isEmpty) logger.warn(s"Querying Accumulo without ST filter.")

    val oint  = IndexSchema.somewhen(interval)

    // set up row ranges and regular expression filter
    val qp = planQuery(filter, output)

    output("Configuring batch scanner for ST table: \n" +
      s"  Filter ${query.getFilter}\n" +
      s"  STII Filter: ${ofilter.getOrElse("No STII Filter")}\n" +
      s"  Interval:  ${oint.getOrElse("No interval")}\n" +
      s"  Filter: ${Option(filter).getOrElse("No Filter")}\n" +
      s"  ECQL: ${Option(ecql).getOrElse("No ecql")}\n" +
      s"Query: ${Option(query).getOrElse("no query")}.")

    val iteratorConfig = IteratorTrigger.chooseIterator(ecql, query, featureType)

    val stIdxIterCfg =
      iteratorConfig.iterator match {
        case IndexOnlyIterator  =>
          val transformedSFType = transformedSimpleFeatureType(query).getOrElse(featureType)
          configureIndexIterator(ofilter, query, transformedSFType)
        case SpatioTemporalIterator =>
          val isDensity = query.getHints.containsKey(DENSITY_KEY)
          configureSpatioTemporalIntersectingIterator(ofilter, featureType, isDensity)
      }

    val sffiIterCfg =
      if (iteratorConfig.useSFFI) {
        Some(configureSimpleFeatureFilteringIterator(featureType, ecql, query))
      } else None

    val topIterCfg = if(query.getHints.containsKey(DENSITY_KEY)) {
      val clazz = classOf[DensityIterator]

      val cfg = new IteratorSetting(iteratorPriority_AnalysisIterator,
        "topfilter-" + randomPrintableString(5),
        clazz)

      val width = query.getHints.get(WIDTH_KEY).asInstanceOf[Int]
      val height =  query.getHints.get(HEIGHT_KEY).asInstanceOf[Int]
      val polygon = if(geometryToCover == null) null else geometryToCover.getEnvelope.asInstanceOf[Polygon]

      DensityIterator.configure(cfg, polygon, width, height)

      cfg.addOption(DEFAULT_SCHEMA_NAME, schema)
      configureFeatureEncoding(cfg)
      configureFeatureType(cfg, featureType)

      Some(cfg)
    } else None

    qp.copy(iterators = qp.iterators ++ List(Some(stIdxIterCfg), sffiIterCfg, topIterCfg).flatten)
  }

  def filterListAsAnd(filters: Seq[Filter]): Option[Filter] = filters match {
    case Nil => None
    case _ => Some(ff.and(filters))
  }

  def buildFilter(geom: Geometry, interval: Interval): KeyPlanningFilter =
    (IndexSchema.somewhere(geom), IndexSchema.somewhen(interval)) match {
      case (None, None)       =>    AcceptEverythingFilter
      case (None, Some(i))    =>
        if (i.getStart == i.getEnd) DateFilter(i.getStart)
        else                        DateRangeFilter(i.getStart, i.getEnd)
      case (Some(p), None)    =>    SpatialFilter(p)
      case (Some(p), Some(i)) =>
        if (i.getStart == i.getEnd) SpatialDateFilter(p, i.getStart)
        else                        SpatialDateRangeFilter(p, i.getStart, i.getEnd)
    }

  def netPolygon(poly: Polygon): Polygon = poly match {
    case null => null
    case p if p.covers(IndexSchema.everywhere) =>
      IndexSchema.everywhere
    case p if IndexSchema.everywhere.covers(p) => p
    case _ => poly.intersection(IndexSchema.everywhere).
      asInstanceOf[Polygon]
  }

  def netGeom(geom: Geometry): Geometry =
    Option(geom).map(_.intersection(IndexSchema.everywhere)).orNull

  def netInterval(interval: Interval): Interval = interval match {
    case null => null
    case _    => IndexSchema.everywhen.overlap(interval)
  }


  def planQuery(filter: KeyPlanningFilter, output: ExplainerOutputType): QueryPlan = {
    output(s"Planning query")
    val keyPlan = keyPlanner.getKeyPlan(filter, output)
    output(s"Got keyplan ${keyPlan.toString.take(1000)}")

    val columnFamilies = cfPlanner.getColumnFamiliesToFetch(filter)

    // always try to use range(s) to remove easy false-positives
    val accRanges: Seq[org.apache.accumulo.core.data.Range] = keyPlan match {
      case KeyRanges(ranges) => ranges.map(r => new org.apache.accumulo.core.data.Range(r.start, r.end))
      case _ => Seq(new org.apache.accumulo.core.data.Range())
    }

    output(s"Setting ${accRanges.size} ranges.")

    // always try to set a RowID regular expression
    //@TODO this is broken/disabled as a result of the KeyTier
    val iters =
      keyPlan.toRegex match {
        case KeyRegex(regex) => Seq(configureRowRegexIterator(regex))
        case _               => Seq()
      }

    // if you have a list of distinct column-family entries, fetch them
    val cf = columnFamilies match {
      case KeyList(keys) =>
        output(s"Settings ${keys.size} column fams: $keys.")
        keys.map { cf => new Text(cf) }

      case _ =>
        Seq()
    }

    QueryPlan(iters, accRanges, cf)
  }

  //override def iqp: IndexQueryPlanner = ???

  //override def execute(acc: AccumuloConnectorCreator, sft: SimpleFeatureType, derivedQuery: Query, isDensity: Boolean, output: ExplainerOutputType): SelfClosingIterator[Entry[Key, Value]] = ???
}
