angular.module('stealth.timelapse.stores', [
    'stealth.core.geo.ows'
])

.factory('stealth.timelapse.stores.QueryBinStore', [
'$log',
'$rootScope',
'$q',
'$filter',
'CONFIG',
'wfs',
'stealth.timelapse.stores.BinStore',
function ($log, $rootScope, $q, $filter, CONFIG, wfs, BinStore) {
    var tag = 'stealth.timelapse.stores.QueryBinStore: ';
    $log.debug(tag + 'factory started.');

    //TODO: Add streaming query capability
    var QueryBinStore = function (name, fillColorHexString, pointRadius, colorBy, arrayBuffer) {
        $log.debug(tag + 'new QueryBinStore(' + name + ')');
        BinStore.apply(this, arguments);

        var _thisStore = this;
        var _viewState = this.getViewState();
        var _query;
        var _featureTypeProperties;
        this.launchQuery = function (query) {
            _query = query;
            _featureTypeProperties = query.featureTypeData.featureTypes[0].properties;
            var url = query.serverData.currentGeoserverUrl + '/' +
                      query.layerData.currentLayer.prefix;
            var typeName = query.layerData.currentLayer.name;
            var responseType = 'arraybuffer';
            var storeName = query.params.storeName;
            var geom = query.params.geomField.name;
            var dtg = query.params.dtgField.name;
            var id = query.params.idField.name;
            var overrides = {
                sortBy: dtg,
                propertyName: dtg + ',' + geom + ',' + id,
                outputFormat: 'application/vnd.binary-viewer',
                format_options: 'dtg:' + dtg + ';trackId:' + id,
                cql_filter: buildCQLFilter(query)
            };

            wfs.getFeature(url, typeName, CONFIG.geoserver.omitProxy, overrides, responseType)
            .success(function (data, status, headers, config, statusText) {
                var contentType = headers('content-type');
                if (contentType.indexOf('xml') > -1) {
                    $log.error(tag + '(' + _thisStore.getName() + ') ows:ExceptionReport returned');
                    $log.error(data);
                    _viewState.isError = true;
                    _viewState.errorMsg = 'ows:ExceptionReport returned';
                } else {
                    // 'data' expected to be of type ArrayBuffer.
                    if (data.byteLength === 0) {
                        $log.error(tag + '(' + _thisStore.getName() + ') No results');
                        _viewState.isError = true;
                        _viewState.errorMsg = 'No results';
                    } else {
                        _thisStore.setArrayBuffer(data);
                        $rootScope.$emit('timelapse:querySuccessful');
                    }
                }
            })
            .error(function(data, status, headers, config, statusText) {
                var msg = 'HTTP status ' + status + ': ' + statusText;
                $log.error(tag + '(' + _thisStore.getName() + ') ' + msg);
                _viewState.isError = true;
                _viewState.errorMsg = msg;
            });
        };

        this.searchPointAndTime = function (coord, res, timeMillis, windowMillis) {
            var deferred = $q.defer();

            if (_thisStore.getMinTimeInMillis() > timeMillis ||
                _thisStore.getMaxTimeInMillis() < (timeMillis - windowMillis))
            {
                deferred.resolve({
                    name: _thisStore.getName(),
                    isError: false,
                    records: []
                });
                return deferred.promise;
            }

            var startMillis = Math.max(_thisStore.getMinTimeInMillis(), (timeMillis - windowMillis));
            var endMillis = Math.min(_thisStore.getMaxTimeInMillis(), timeMillis);
            var url = _query.serverData.currentGeoserverUrl + '/' +
                      _query.layerData.currentLayer.prefix;
            var typeName = _query.layerData.currentLayer.name;
            var modifier = res * Math.max(this.getPointRadius(), 4);
            var cqlParams = {
                params: {
                    geomField: _query.params.geomField,
                    dtgField: _query.params.dtgField,
                    minLat: Math.max((coord[1] - modifier), -90),
                    maxLat: Math.min((coord[1] + modifier), 90),
                    minLon: Math.max((coord[0] - modifier), -180),
                    maxLon: Math.min((coord[0] + modifier), 180),
                    startDate: moment.utc(startMillis),
                    startTime: moment.utc(startMillis),
                    endDate: moment.utc(endMillis),
                    endTime: moment.utc(endMillis),
                    cql: _query.params.cql
                }
            };
            var overrides = {
                sortBy: _query.dtg,
                cql_filter: buildCQLFilter(cqlParams),
                format_options: 'dtg:' + _query.dtg
            };
            wfs.getFeature(url, typeName, CONFIG.geoserver.omitProxy, overrides)
            .success(function (data, status, headers, config, statusText) {
                var records = _.map(_.pluck(data.features, 'properties'), function (properties) {
                                    _.forEach(properties, function (value, name) {
                                        switch (_.find(_featureTypeProperties, {'name': name}).localType) {
                                            case 'date-time':
                                                properties[name] = moment.utc(value).format('YYYY-MM-DD[T]HH:mm:ss[Z]');
                                                break;
                                            case 'number':
                                                properties[name] = $filter('number')(value);
                                                break;
                                        }
                                    });
                                    return properties;
                });
                deferred.resolve({
                    name: _thisStore.getName(),
                    isError: false,
                    layerFill: {
                        color: _thisStore.getFillColorHexString()
                    },
                    records: records
                });
            })
            .error(function (data, status, headers, config, statusText) {
                deferred.reject({
                    name: _thisStore.getName(),
                    isError: true,
                    reason: statusText
                });
            });
            return deferred.promise;
        };
    };

    QueryBinStore.prototype = Object.create(BinStore.prototype);

    function buildCQLFilter(query) {
        var cql_filter =
            'BBOX(' + query.params.geomField.name + ',' +
            query.params.minLat + ',' + query.params.minLon + ',' +
            query.params.maxLat + ',' + query.params.maxLon + ')' +
            ' AND ' + query.params.dtgField.name + ' DURING ' +
            moment(query.params.startDate).format('YYYY-MM-DD') + 'T' +
            moment(query.params.startTime).format('HH:mm:ss.SSS') + 'Z' +
            '/' +
            moment(query.params.endDate).format('YYYY-MM-DD') + 'T' +
            moment(query.params.endTime).format('HH:mm:ss.SSS') + 'Z';
        if (query.params.cql) {
            cql_filter += ' AND ' + query.params.cql;
        }
        return cql_filter;
    }

    return QueryBinStore;
}])
;

