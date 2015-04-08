angular.module('stealth.timelapse.stores', [
    'stealth.core.geo.ows'
])

.factory('stealth.timelapse.stores.QueryBinStore', [
'$log',
'$rootScope',
'$q',
'$filter',
'$window',
'toaster',
'CONFIG',
'wfs',
'stealth.timelapse.stores.BinStore',
function ($log, $rootScope, $q, $filter, $window, toaster, CONFIG, wfs, BinStore) {
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
        var _summaryQueryCallback;
        this.setSummaryQueryCallback = function (callback) {_summaryQueryCallback = callback;};
        this.launchQuery = function (query) {
            _query = query;
            _featureTypeProperties = query.featureTypeData.featureTypes[0].properties;
            var typeName = query.layerData.currentLayer.Name;
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

            wfs.getFeature(CONFIG.geoserver.defaultUrl, typeName, CONFIG.geoserver.omitProxy, overrides, responseType)
            .success(function (data, status, headers, config, statusText) {
                var contentType = headers('content-type');
                if (contentType.indexOf('xml') > -1) {
                    $log.error(tag + '(' + _thisStore.getName() + ') ows:ExceptionReport returned');
                    $log.error(data);
                    _viewState.isError = true;
                    _viewState.errorMsg = 'ows:ExceptionReport returned';
                    toaster.error('Error: ' + _thisStore.getName(), _viewState.errorMsg);
                } else {
                    // 'data' expected to be of type ArrayBuffer.
                    if (data.byteLength === 0) {
                        $log.error(tag + '(' + _thisStore.getName() + ') No results');
                        _viewState.isError = true;
                        _viewState.errorMsg = 'No results';
                        toaster.error('Error: ' + _thisStore.getName(), _viewState.errorMsg);
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
                toaster.error('Error: ' + _thisStore.getName(), _viewState.errorMsg);
            });
        };

        this.searchPointAndTime = function (coord, res, timeMillis, windowMillis) {
            var deferred = $q.defer();

            var startMillis = Math.max(_thisStore.getMinTimeInMillis(), (timeMillis - windowMillis));
            startMillis -= 1000;
            var endMillis = Math.min(_thisStore.getMaxTimeInMillis(), timeMillis);
            endMillis += 1000;
            var typeName = _query.layerData.currentLayer.Name;
            var modifier = res * Math.max(this.getPointRadius(), 4);
            var cqlParams = {
                params: {
                    geomField: _query.params.geomField,
                    dtgField: _query.params.dtgField,
                    minLat: Math.max((coord[1] - modifier), _query.params.minLat),
                    maxLat: Math.min((coord[1] + modifier), _query.params.maxLat),
                    minLon: Math.max((coord[0] - modifier), _query.params.minLon),
                    maxLon: Math.min((coord[0] + modifier), _query.params.maxLon),
                    startDtg: moment.utc(startMillis),
                    endDtg: moment.utc(endMillis),
                    cql: _query.params.cql
                }
            };

            if (_thisStore.getMinTimeInMillis() > timeMillis ||
                _thisStore.getMaxTimeInMillis() < (timeMillis - windowMillis) ||
                cqlParams.params.minLat > cqlParams.params.maxLat ||
                cqlParams.params.minLon > cqlParams.params.maxLon)
            {
                deferred.resolve({
                    name: _thisStore.getName(),
                    isError: false,
                    records: []
                });
                return deferred.promise;
            }

            var capabilities = _query.layerData.currentLayer.KeywordConfig.capability || {};
            if (!_.isUndefined(capabilities['summary'])) {
                if (_.isUndefined(_summaryQueryCallback)) {
                    delete capabilities['summary'];
                } else {
                    capabilities['summary']['toolTipText'] = 'Get summary';
                    capabilities['summary']['iconClass'] = 'fa-location-arrow';
                    capabilities['summary']['onClick'] = _summaryQueryCallback;
                }
            }

            var overrides = {
                cql_filter: buildCQLFilter(cqlParams)
            };

            wfs.getFeature(CONFIG.geoserver.defaultUrl, typeName, CONFIG.geoserver.omitProxy, overrides)
            .success(function (data, status, headers, config, statusText) {
                var records = _.pluck(data.features, 'properties');
                deferred.resolve({
                    name: _thisStore.getName(),
                    isError: false,
                    layerFill: {
                        color: _thisStore.getFillColorHexString()
                    },
                    records: records,
                    capabilities: capabilities,
                    fieldTypes: _featureTypeProperties,
                    isFilterable: true,
                    filterHandler: function (key, val) {
                        var newQuery = _.cloneDeep(_query);
                        newQuery.params.startDtg = moment(_query.params.startDtg);
                        newQuery.params.endDtg = moment(_query.params.endDtg);
                        var filter = key + '=' + (angular.isString(val) ? "'" + val + "'" : val);
                        if (!newQuery.params.cql || _.trim(newQuery.params.cql) === '') {
                            newQuery.params.cql = filter;
                        } else {
                            newQuery.params.cql = _.trim(newQuery.params.cql) + ' AND ' + filter;
                        }
                        newQuery.params.storeName = newQuery.params.storeName + ' (' + filter + ')';
                        $rootScope.$emit('Launch Timelapse Wizard', newQuery);
                    }
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

        this.exportBin = function (outputFormat) {
            //Default is bin format.  Don't requery for bin format.
            if (!_.isString(outputFormat) || outputFormat === 'bin') {
                var blob = new Blob([this.getArrayBuffer()], {type: 'application/octet-binary'});
                saveAs(blob, this.getName().trim().replace(/\W/g, '_') + '.bin');
            } else {
                var url = $filter('cors')(CONFIG.geoserver.defaultUrl, 'wfs', CONFIG.geoserver.omitProxy);
                $window.open(url + '?' + [
                    'service=WFS',
                    'version=1.0.0',
                    'request=GetFeature',
                    'typeName=' + _query.layerData.currentLayer.Name,
                    'srsName=EPSG:4326',
                    'outputFormat=' + outputFormat,
                    'cql_filter=' + buildCQLFilter(_query)
                ].join('&'));
            }
        };
    };

    QueryBinStore.prototype = Object.create(BinStore.prototype);

    function buildCQLFilter(query) {
        var cql_filter =
            'BBOX(' + query.params.geomField.name + ',' +
            query.params.minLon + ',' + query.params.minLat + ',' +
            query.params.maxLon + ',' + query.params.maxLat + ')' +
            ' AND ' + query.params.dtgField.name + ' DURING ' +
            query.params.startDtg.format('YYYY-MM-DD[T]HH:mm:ss[Z]') +
            '/' +
            query.params.endDtg.format('YYYY-MM-DD[T]HH:mm:ss[Z]');
        if (query.params.cql) {
            cql_filter += ' AND ' + query.params.cql;
        }
        return cql_filter;
    }

    return QueryBinStore;
}])
;

