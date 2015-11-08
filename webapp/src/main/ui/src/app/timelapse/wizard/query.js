angular.module('stealth.timelapse.wizard.query', [
    'ngSanitize',
    'stealth.core.utils',
    'stealth.core.utils.cookies',
    'stealth.timelapse',
    'stealth.timelapse.stores'
])

.service('queryService', [
'$rootScope',
'tlLayerManager',
'stealth.timelapse.stores.LineQueryBinStore',
'stealth.timelapse.stores.QueryBinStore',
function ($rootScope, tlLayerManager, LineQueryBinStore, QueryBinStore) {
    var hLayer;

    this.launchBinQuery = function (query) {
        //Either a valid line-query or not a line-query at all
        //If not either, silently do nothing.
        if (query.isValidLineQuery() || !query.isLineQuery()) {
            hLayer = tlLayerManager.getHistoricalLayer();
            var name = query.params.storeName;
            var store = query.isValidLineQuery() ?
                new LineQueryBinStore(name) : new QueryBinStore(name);
            hLayer.addStore(store);
            store.launchQuery(query);
        }
    };

    $rootScope.$on('timelapse:querySuccessful', function () {
        hLayer.setDtgBounds();
    });
}])

.factory('stealth.timelapse.wizard.Query', [
'$filter',
'cookies',
'wfs',
'ol3Map',
'owsLayers',
'CONFIG',
function ($filter, cookies, wfs, ol3Map, owsLayers, CONFIG) {
    var idSeq = 1;

    var query = function (overrides) {
        var _self = this;
        var _now = moment().utc();
        var _defaultTimeWindow = _now.clone().subtract(1, 'hours');

        this.layerData = {};
        this.timeData = {
            maxTimeRangeMillis: Number.POSITIVE_INFINITY,
            valid: true
        };
        this.params = {
            sortOnServer: false,
            idField: null,
            geomField: null,
            dtgField: null,
            startDtgField: null,
            endDtgField: null,
            storeName: 'History ' + idSeq++,
            maxLat: 90,
            minLat: -90,
            maxLon: 180,
            minLon: -180,
            startDtg: _defaultTimeWindow,
            endDtg: _now,
            cql: null
        };

        this.updateTimeRange = function (range) {
            if (_.isNumber(range)) {
                var now = moment.utc();
                var past = now.clone().subtract(range, 'hours');
                this.checkAndSetTimeRange(past, now);
            }
        };

        this.checkAndSetTimeRange = function (start, end, skipCookie) {
            var range = {
                startDtg: start,
                endDtg: end
            };
            _.merge(this.params, range);
            if (!skipCookie) {
                //Save cookie - expires in a year
                cookies.put('timelapse.wizard.time', 0, range, moment.utc().add(1, 'y'));
            }

            // Let's check if this range is valid
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
            // If we're here, range is valid.
            this.timeData.valid = true;
            delete this.timeData.errorMsg;
        };


        // Format min or max time range
        var availMsgDateString = function (m) {
            var format = 'YYYY MMM DD HH:mm:ss';
            return m.format(format);
        };
        var isValidMsgTime = function (t) {
            return t.isValid();
        };
        // Compute time range, alert user if the data layer has a corresponding min/max keyword (or UNKNOWN min/max)
        this.computeAvailMsg = function (minTime, maxTime) {
            if (isValidMsgTime(minTime) && isValidMsgTime(maxTime)) {
                return availMsgDateString(minTime) +' to '+ availMsgDateString(maxTime) + '.';
            } else if (isValidMsgTime(minTime) && !isValidMsgTime(maxTime)) {
                return availMsgDateString(minTime) + ' to UNKNOWN.';
            } else if (!isValidMsgTime(minTime) && isValidMsgTime(maxTime)) {
                return 'UNKNOWN to ' + availMsgDateString(maxTime) + '.';
            } else {
                return 'UNKNOWN time range.';
            }
        };

        this.checkAndSetBounds = function (extent, skipCookie) {
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

            if (!skipCookie) {
                // Save cookie - expires in a year
                cookies.put('timelapse.wizard.bbox', 0, bbox, moment.utc().add(1, 'y'));
            }
        };

        // Invoked when the current selected layer changes on query form.
        this.getFeatureTypeDescription = function () {
            _self.layerData.error = null;
            _self.featureTypeData = null;
            _self.params.idField = null;
            _self.params.geomField = null;
            _self.params.dtgField = null;
            _self.params.startDtgField = null;
            _self.params.endDtgField = null;

            wfs.getFeatureTypeDescription(CONFIG.geoserver.defaultUrl,
                                          _self.layerData.currentLayer.Name,
                                          CONFIG.geoserver.omitProxy)
            .then(
                function (data) {
                    if (data.error) { // Response is successful,
                                      // but no description is
                                      // found for the type.
                        _self.featureTypeData = 'unavailable';
                    } else {
                        var id = _.find(data.featureTypes[0].properties, {'name': _self.layerData.currentLayer.fieldNames.trkId});
                        if (id !== undefined) {
                            _self.params.idField = id;
                        }
                        var dtg = _.find(data.featureTypes[0].properties, {'name': _self.layerData.currentLayer.fieldNames.dtg});
                        if (dtg !== undefined) {
                            _self.params.dtgField = dtg;
                        }
                        var geom = _.find(data.featureTypes[0].properties, {'name': _self.layerData.currentLayer.fieldNames.geom});
                        if (geom !== undefined) {
                            _self.params.geomField = geom;
                        }
                        if (_self.layerData.currentLayer.fieldNames.startDtg) {
                            var startDtg = _.find(data.featureTypes[0].properties, {'name': _self.layerData.currentLayer.fieldNames.startDtg});
                            if (dtg !== undefined) {
                                _self.params.startDtgField = startDtg;
                            }
                        }
                        if (_self.layerData.currentLayer.fieldNames.endDtg) {
                            var endDtg = _.find(data.featureTypes[0].properties, {'name': _self.layerData.currentLayer.fieldNames.endDtg});
                            if (dtg !== undefined) {
                                _self.params.endDtgField = endDtg;
                            }
                        }
                        _self.featureTypeData = data;
                    }
                },
                function (error) {
                    _self.layerData.error =
                        'GetFeatureTypeDescription request failed. Error: ' +
                        error.status + ' ' + error.statusText;
                }
            );

            // Set time range limit, if this layer has one. Set time range message.
            this.timeData.maxTimeRangeMillis = _self.layerData.currentLayer.maxTimeRangeMillis;
            this.timeData.maxTime = _self.layerData.currentLayer.maxTime;
            this.timeData.minTime = _self.layerData.currentLayer.minTime;
            this.timeData.availMsg = this.computeAvailMsg(this.timeData.minTime, this.timeData.maxTime);
            this.checkAndSetTimeRange(_self.params.startDtg, _self.params.endDtg, true);
        };

        this.getLineQueryConditions = function () {
            return [
                _self.params.startDtgField,
                _self.params.endDtgField,
                _.get(_self.params, 'dtgField.localType') === 'string', // List reported as 'string', for some reason
                _.get(_self.params, 'geomField.localType') === 'LineString'
            ];
        };
        this.isLineQuery = function () {
            return _.any(this.getLineQueryConditions(), Boolean);
        };
        this.isValidLineQuery = function () {
            return _.all(this.getLineQueryConditions(), Boolean);
        };

        var keywordPrefix = ['timelapse', 'historical'];
        owsLayers.getLayers(keywordPrefix, true)
            .then(function (layers) {
                _self.layerData.layers = _.sortBy(layers, 'Title');
                _.each(_self.layerData.layers, function (layer) {
                    _.each(_.keys(_.get(layer.KeywordConfig, keywordPrefix)), function (workspace) {
                        layer.fieldNames = _.merge({
                            trkId: 'trkId',
                            geom: 'geom',
                            dtg: 'dtg'
                        }, _.get(layer.KeywordConfig, keywordPrefix.concat([workspace, 'field'])));
                        layer.maxTimeRangeMillis =
                            parseInt(_.get(layer.KeywordConfig, keywordPrefix.concat([workspace, 'maxTimeRangeMillis'])), 10) ||
                            Number.POSITIVE_INFINITY;
                        // Min and max data availability alert
                        layer.minTime = moment.utc(_.get(layer.KeywordConfig, keywordPrefix.concat([workspace, 'minTime']), null));
                        layer.maxTime = moment.utc(_.get(layer.KeywordConfig, keywordPrefix.concat([workspace, 'maxTime']), null));
                    });
                });
                if (!_.isEmpty(_self.layerData.layers)) {
                    if (_self.params.currentLayer) {
                        _self.layerData.currentLayer = _.find(_self.layerData.layers, {'Name': _self.params.currentLayer.Name});
                    }
                    _self.layerData.currentLayer = _self.layerData.currentLayer || _self.layerData.layers[0];
                    _self.getFeatureTypeDescription();
                }

                // Initialize values
                _self.checkAndSetBounds(ol3Map.getExtent(), true);
                _.merge(
                    _self.params,
                    cookies.get('timelapse.wizard.bbox', 0),
                    _.mapValues(cookies.get('timelapse.wizard.time', 0), function (time) {
                        return time ? moment.utc(time) : null;
                    }),
                    overrides
                );
                _self.checkAndSetBounds([_self.params.minLon, _self.params.minLat, _self.params.maxLon, _self.params.maxLat], true);
                _self.checkAndSetTimeRange(_self.params.startDtg, _self.params.endDtg, true);
            });
    };

    return query;
}])
;
