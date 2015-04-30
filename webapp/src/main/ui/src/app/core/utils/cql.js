angular.module('stealth.core.utils')

/**
 * Helper utility for building CQL query strings
 */
.service('cqlHelper', [
function () {
    /**
     * CQL operators
     * @readonly
     * @enum {string}
     */
    this.operator = {
        AND: 'AND',
        OR: 'OR'
    };

    /**
     * Combines clauses with an operator.  Handles non-existent and empty clauses.
     * @param {cqlHelper.operator} operator - Combining operator
     * @param {(...string|string[])} clause - Clauses to combine
     *
     * @returns {string}
     */
    this.combine = function (operator, clause) {
        //Create array of non-empty clauses
        var clauses = _.filter(_.flatten(_.rest(arguments)), function (c) {
            return _.isString(c) && !_.isEmpty(c.trim());
        });
        //If more than one, wrap in parens
        if (clauses.length > 1) {
            clauses = _.map(clauses, function (c) {
                return '(' + c.trim() + ')';
            });
        } else { //otherwise, just trim
            clauses = _.map(clauses, function (c) {
                return c.trim();
            });
        }
        return clauses.join(' ' + operator + ' ') || 'INCLUDE';
    };

    /**
     * Creates a datetime clause.  Can have lower bound, upper bound, or both.
     * @param {string} dtgField - Name of the datetime field to query
     * @param {moment} [startDtg] - Lower bound
     * @param {moment} [endDtg] - Upper bound
     *
     * @returns {string}
     */
    this.buildDtgFilter = function (dtgField, startDtg, endDtg) {
        if (startDtg && endDtg) {
            var start = startDtg;
            var end = endDtg;
            if (startDtg.isAfter(endDtg)) {
                start = endDtg;
                end = startDtg;
            }
            return dtgField + ' DURING ' + start.toISOString() + '/' + end.toISOString();
        } else if (startDtg) {
            return dtgField + ' AFTER ' + startDtg.toISOString();
        } else if (endDtg) {
            return dtgField + ' BEFORE ' + endDtg.toISOString();
        }
        return 'INCLUDE';
    };

    /**
     * Creates a bounding box clause
     * @param {string} geomField - Name of the geometry field to bound
     * @param {number[]} extent - Array representing bbox extent [minX, minY, maxX, maxY]
     *
     * @returns {string}
     */
    this.buildBboxFilter = function (geomField, extent) {
        return 'BBOX(' + geomField + ',' + extent.join() + ')';
    };

    /**
     * Creates a combined bbox, datetime, and "anything else" filter
     * @param {Object} params - Object containing query params
     * @param {string} params.geomField.name - Name of the geometry field to bound
     * @param {number} params.minLon - Minimum longitude
     * @param {number} params.minLat - Minimum latitude
     * @param {number} params.maxLon - Maximum longitude
     * @param {number} params.maxLat - Maximum latitude
     * @param {string} params.dtgField.name - Name of the datetime field to query
     * @param {moment} [params.startDtg] - Lower time bound
     * @param {moment} [params.endDtg] - Upper time bound
     * @param {string} [params.cql] - Any additional CQL filter
     *
     * @return {string}
     */
    this.buildSpaceTimeFilter = function (params) {
        return this.combine(this.operator.AND,
            this.buildBboxFilter(params.geomField.name, [
                params.minLon,
                params.minLat,
                params.maxLon,
                params.maxLat]),
            this.buildDtgFilter(params.dtgField.name,
                params.startDtg, params.endDtg),
            params.cql
        );
    };
}])
;
