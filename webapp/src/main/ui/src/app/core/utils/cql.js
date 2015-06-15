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
            return _.isString(c) && !_.isEmpty(c.trim()) && !_.isEmpty(c.replace(/[()]|INCLUDE/gi, '').trim());
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
     * @param {boolean} [dtgFieldIsString] - Treat the datetime field as a String field, instead of a Date field
     *
     * @returns {string}
     */
    this.buildDtgFilter = function (dtgField, startDtg, endDtg, dtgFieldIsString, dtgFormatter) {
        var _dtgFieldIsString = !!dtgFieldIsString;
        var fmtDate = _.isFunction(dtgFormatter) ? dtgFormatter : function (dtg) { return dtg.toISOString(); };
        if (startDtg && endDtg) {
            var start = startDtg;
            var end = endDtg;
            if (startDtg.isAfter(endDtg)) {
                start = endDtg;
                end = startDtg;
            }
            if (_dtgFieldIsString) {
                return dtgField + " >= '" + fmtDate(start) + "' AND " + dtgField + " <= '"+ fmtDate(end) + "'";
            } else {
                return dtgField + ' DURING ' + fmtDate(start) + '/' + fmtDate(end);
            }
        } else if (startDtg) {
            if (_dtgFieldIsString) {
                return dtgField + " >= '" + fmtDate(startDtg) + "'";
            } else {
                return dtgField + ' AFTER ' + fmtDate(startDtg);
            }
        } else if (endDtg) {
            if (_dtgFieldIsString) {
                return dtgField + " <= '" + fmtDate(endDtg) + "'";
            } else {
                return dtgField + ' BEFORE ' + fmtDate(endDtg);
            }
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
     * @param {boolean} params.dtgField.isString - The datetime field should be treated as a String, not a Date
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
                params.startDtg, params.endDtg, params.dtgField.isString, params.dtgField.dtgFormatter),
            params.cql
        );
    };
}])
;
