angular.module('stealth.imagery.omar.wizard.query', [
    'stealth.core.utils'
])

/**
 * This class is largely a rip-off of the Query class for timelapse queries. The two should be refactored.
 */
.factory('stealth.imagery.omar.wizard.Query', [
'$filter',
'wfs',
'cqlHelper',
function ($filter, wfs, cqlHelper) {
    var idSeq = 1;

    var query = function (OMAR) {
        var _self = this;

        var _now = moment().utc();
        var diff = OMAR.defaultTime.diff ? OMAR.defaultTime.diff : 1;
        var diffUnits = OMAR.defaultTime.diffUnits ? OMAR.defaultTime.diffUnits : "hours";
        var _defaultTimeWindow = _now.clone().subtract(diff, diffUnits);

        this.layerData = {};
        this.timeData = {
            range: 'Custom',
            isCustom: true,
            maxTimeRangeMillis: Number.POSITIVE_INFINITY,
            valid: true
        };

        this.params = {
            server: _.isEmpty(OMAR.servers) ? null : OMAR.servers[0],
            storeName: 'Imagery ' + idSeq++,
            maxLat: 90,
            minLat: -90,
            maxLon: 180,
            minLon: -180,
            startDtg: _defaultTimeWindow,
            endDtg: _now,
            a: '',
            b: '',
            c: '',
            d: '',
            e: '',
            f: '',
            filename: '',
            cqlFilter: '',
            sortField: '',
            sortOrder: 'D',
            cql: null
        };

        this.checkAndSetTimeRange = function (start, end) {
            var range = {
                startDtg: start,
                endDtg: end
            };
            _.merge(this.params, range);

            //Let's check if this range is valid
            delete this.timeData.valid;
            if (!moment.isMoment(start)) {
                this.timeData.errorMsg = 'Invalid start time';
                return;
            }
            if (!moment.isMoment(end)) {
                this.timeData.errorMsg = 'Invalid end time';
                return;
            }
            var diffMillis = end.diff(start);
            if (diffMillis < 1) {
                this.timeData.errorMsg = 'End time must be after start time';
                return;
            }
            if (_.isNumber(this.timeData.maxTimeRangeMillis) && diffMillis > this.timeData.maxTimeRangeMillis) {
                this.timeData.errorMsg = 'Range must be less than ' +
                    $filter('millisToDHMS')(this.timeData.maxTimeRangeMillis, true);
                return;
            }
            //If we're here, range is valid.
            this.timeData.valid = true;
            delete this.timeData.errorMsg;
        };

        this.checkAndSetBounds = function (extent) {
            var filter = $filter('number');
            var trimmed = _.map(extent, function (val) {
                return parseFloat(filter(val, 5));
            });
            var bbox = {
                minLon: trimmed[0] < -180 ? -180 : trimmed[0],
                minLat: trimmed[1] < -90 ? -90 : trimmed[1],
                maxLon: trimmed[2] > 180 ? 180 : trimmed[2],
                maxLat: trimmed[3] > 90 ? 90 : trimmed[3]
            };
            _.merge(this.params, bbox);
        };


        this.results = [];

        this.running = false;

        this.buildCql = function (criteriaObj) {
            var arr = [];

            criteriaObj.geomField = {name: criteriaObj.server.geomField};
            var dtgFormatter = null;
            if (_.isString(criteriaObj.server.dtgFieldFormat)) {
                var utc = true;
                if (_.has(criteriaObj.server, 'dtgFieldFormatUTC')) {
                    utc = criteriaObj.server.dtgFieldFormatUTC;
                }
                if (utc) {
                    dtgFormatter = function (dtg) { return moment(dtg).utc().format(criteriaObj.server.dtgFieldFormat); };
                } else {
                    dtgFormatter = function (dtg) { return moment(dtg).format(criteriaObj.server.dtgFieldFormat); };
                }
            }
            criteriaObj.dtgField = {
                name: criteriaObj.server.dtgField,
                isString: !!criteriaObj.server.dtgFieldIsString,
                dtgFormatter: dtgFormatter
            };

            arr.push(cqlHelper.buildSpaceTimeFilter(criteriaObj));

            if (!_.isEmpty(criteriaObj.a.trim())) {
                arr.push(OMAR.metadata.fields.a.name + " = '" + criteriaObj.a + "'");
            }
            if (!_.isEmpty(criteriaObj.b.trim())) {
                arr.push(OMAR.metadata.fields.b.name + " = '" + criteriaObj.b + "'");
            }
            if (!_.isEmpty(criteriaObj.c.trim())) {
                arr.push(OMAR.metadata.fields.c.name + " = '" + criteriaObj.c + "'");
            }
            if (!_.isEmpty(criteriaObj.d.trim())) {
                arr.push(OMAR.metadata.fields.d.name + " = '" + criteriaObj.d + "'");
            }
            if (_.isFinite(parseFloat(criteriaObj.e.trim()))) {
                arr.push(OMAR.metadata.fields.e.name + " >= " + criteriaObj.e.trim());
            }
            if (!_.isEmpty(criteriaObj.f.trim())) {
                arr.push(OMAR.metadata.fields.f.name + " = '" + criteriaObj.f + "'");
            }
            if (!_.isEmpty(criteriaObj.filename.trim())) {
                arr.push("filename = '" + criteriaObj.filename + "'");
            }
            if (!_.isEmpty(criteriaObj.cqlFilter.trim())) {
                arr.push(criteriaObj.cqlFilter);
            }

            return cqlHelper.combine(cqlHelper.operator.AND, arr);
        };

        this.findImagery = function () {
            _self.step = 2;
            _self.running = true;
            _self.results = [];

            var args = {
                outputFormat: _.isUndefined(_self.params.server.format) ? null : _self.params.server.format
            };
            var wfsFilterParamName = _self.params.server.wfsFilterParamName ? _self.params.server.wfsFilterParamName : 'cql_filter';
            args[wfsFilterParamName] = _self.buildCql(_self.params);

            // the third argument is the "omitProxy" flag, we always want to omit the proxy
            var featurePromise = wfs.getFeature(_self.params.server.wfsUrl, _self.params.server.typeName, true, args);

            featurePromise["finally"](function () { // To satisfy Fortify.
                _self.running = false;
            });

            return featurePromise;
        };
    };

    return query;
}])
;
