/*
 * Copyright 2013-2014 Commonwealth Computer Research, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.locationtech.geomesa.core.index

import org.geotools.data.Query
import org.locationtech.geomesa.core.index.QueryHints._
import org.opengis.feature.simple.SimpleFeatureType
import org.opengis.filter.{Id, PropertyIsLike, _}

import scala.collection.JavaConversions._

object QueryStrategyDecider {

  import org.locationtech.geomesa.core.index.AttributeIndexStrategy.getAttributeIndexStrategy

  def chooseStrategy(isCatalogTableFormat: Boolean,
                     sft: SimpleFeatureType,
                     query: Query): Strategy =
    // if datastore doesn't support attr index use spatiotemporal only
    if (isCatalogTableFormat) chooseNewStrategy(sft, query) else new STIdxStrategy

  def chooseNewStrategy(sft: SimpleFeatureType, query: Query): Strategy = {
    val filter = query.getFilter
    val isDensity = query.getHints.containsKey(BBOX_KEY)

    if (isDensity) {
      // TODO GEOMESA-322 use other strategies with density iterator
      new STIdxStrategy
    } else {
      // check if we can use the attribute index first
      val attributeStrategy = getAttributeIndexStrategy(filter, sft)
      attributeStrategy.getOrElse {
        filter match {
          case idFilter: Id => new RecordIdxStrategy
          case and: And => processAnd(isDensity, sft, and)
          case cql          => new STIdxStrategy
        }
      }
    }
  }

  private def processAnd(isDensity: Boolean, sft: SimpleFeatureType, and: And): Strategy = {
    if (and.getChildren.exists(c => getAttributeIndexStrategy(c, sft).isDefined)) {
      //311 - return AttributeStrategy using first attr as index and containing simple feature filtering iterator to filter out remaining attrs
      //once AttributeIndexStrategy can handle this -> getAttributeIndexStrategy(attributeIndexFilter.get, sft).get
      new STIdxStrategy
    } else {
      //other cases - flesh out, there may be record id lookup + attr
      new STIdxStrategy
    }
  }

  // TODO try to use wildcard values from the Filter itself (https://geomesa.atlassian.net/browse/GEOMESA-309)
  // Currently pulling the wildcard values from the filter
  // leads to inconsistent results...so use % as wildcard
  val MULTICHAR_WILDCARD = "%"
  val SINGLE_CHAR_WILDCARD = "_"
  val NULLBYTE = Array[Byte](0.toByte)

  /* Like queries that can be handled by current reverse index */
  def likeEligible(filter: PropertyIsLike) = containsNoSingles(filter) && trailingOnlyWildcard(filter)

  /* contains no single character wildcards */
  def containsNoSingles(filter: PropertyIsLike) =
    !filter.getLiteral.replace("\\\\", "").replace(s"\\$SINGLE_CHAR_WILDCARD", "").contains(SINGLE_CHAR_WILDCARD)

  def trailingOnlyWildcard(filter: PropertyIsLike) =
    (filter.getLiteral.endsWith(MULTICHAR_WILDCARD) &&
      filter.getLiteral.indexOf(MULTICHAR_WILDCARD) == filter.getLiteral.length - MULTICHAR_WILDCARD.length) ||
      filter.getLiteral.indexOf(MULTICHAR_WILDCARD) == -1

}
