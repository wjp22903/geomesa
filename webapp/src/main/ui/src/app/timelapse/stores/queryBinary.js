angular.module('stealth.timelapse.stores', [
    'stealth.core.geo.ows',
    'stealth.core.popup.capabilities',
    'stealth.core.utils'
])

.factory('stealth.timelapse.stores.QueryBinStore', [
'$log',
'$rootScope',
'$q',
'$filter',
'$window',
'toastr',
'cqlHelper',
'clickSearchHelper',
'CONFIG',
'wfs',
'queryBinStoreExtender',
'stealth.timelapse.stores.BinStore',
function ($log, $rootScope, $q, $filter, $window, toastr, cqlHelper, clickSearchHelper,
          CONFIG, wfs, queryBinStoreExtender, BinStore) {
    var tag = 'stealth.timelapse.stores.QueryBinStore: ';
    $log.debug(tag + 'factory started.');

    //TODO: Add streaming query capability
    var QueryBinStore = function () {
        BinStore.apply(this, arguments);
        $log.debug(tag + 'new QueryBinStore(' + this.getName() + ')');

        var _thisStore = this;
        var _viewState = this.getViewState();
        var _query;
        var _featureTypeProperties;

        this.getQuery = function () { return _query; };

        this.launchQuery = function (query) {
            _query = query;
            _featureTypeProperties = query.featureTypeData.featureTypes[0].properties;
            var typeName = query.layerData.currentLayer.Name;
            var responseType = 'arraybuffer';
            var geom = query.params.geomField.name;
            var dtg = query.params.dtgField.name;
            var id = query.params.idField.name;
            var label = query.layerData.currentLayer.fieldNames.label;
            var overrides = {
                propertyName: _.compact([dtg, geom, id, label]).join(),
                outputFormat: 'application/vnd.binary-viewer',
                format_options: 'geom:' + geom + ';dtg:' + dtg + ';trackId:' + id + (label ? ';label:' + label : '') +
                    (query.params.sortOnServer ? ';sort=true' : ''),
                cql_filter: cqlHelper.buildSpaceTimeFilter(query.params)
            };

            wfs.getFeature(CONFIG.geoserver.defaultUrl, typeName, CONFIG.geoserver.omitProxy, overrides, responseType)
            .success(function (data, status, headers, config, statusText) { //eslint-disable-line no-unused-vars
                var contentType = headers('content-type');
                if (contentType.indexOf('xml') > -1) {
                    $log.error(tag + '(' + _thisStore.getName() + ') ows:ExceptionReport returned');
                    $log.error(data);
                    _viewState.isError = true;
                    _viewState.errorMsg = 'ows:ExceptionReport returned';
                    toastr.error('Error: ' + _thisStore.getName(), _viewState.errorMsg);
                } else if (data.byteLength === 0) {
                    $log.error(tag + '(' + _thisStore.getName() + ') No results');
                    _viewState.isError = true;
                    _viewState.errorMsg = 'No results';
                    toastr.error('Error: ' + _thisStore.getName(), _viewState.errorMsg);
                } else {
                    _thisStore.setArrayBuffer(data, query.params.sortOnServer, function () {
                        $rootScope.$emit('timelapse:querySuccessful');
                    });
                }
            })
            .error(function (data, status, headers, config, statusText) { //eslint-disable-line no-unused-vars
                var msg = 'HTTP status ' + status + ': ' + statusText;
                $log.error(tag + '(' + _thisStore.getName() + ') ' + msg);
                _viewState.isError = true;
                _viewState.errorMsg = msg;
                toastr.error('Error: ' + _thisStore.getName(), _viewState.errorMsg);
            });
        };

        function boundStartMillis (t) {
            return Math.max(_thisStore.getMinTimeInMillis(), t) - 1000;
        }

        function boundEndMillis (t) {
            return Math.min(_thisStore.getMaxTimeInMillis(), t) + 1000;
        }

        var searchPointAndTimeWithCql = function (cql, capabilities, coord, clickOverrides) {
            var deferred = $q.defer();

            var overrides = {
                cql_filter: cql
            };

            var typeName = _query.layerData.currentLayer.Name;
            wfs.getFeature(CONFIG.geoserver.defaultUrl, typeName, CONFIG.geoserver.omitProxy, overrides)
            .success(function (data, status, headers, config, statusText) { //eslint-disable-line no-unused-vars
                var trimmedFeatures = clickSearchHelper.sortAndTrimFeatures(coord, data.features, clickOverrides);
                var omitKeys = _.keys(_.get(_query.layerData.currentLayer.KeywordConfig, 'field.hide'));
                var records = _.map(_.pluck(trimmedFeatures, 'properties'), function (record) {
                    return _.omit(record, omitKeys);
                });
                deferred.resolve({
                    name: _thisStore.getName(),
                    isError: false,
                    getLayerLegendStyle: function () {
                        return {color: _thisStore.getFillColorHexString()};
                    },
                    records: records,
                    capabilities: capabilities,
                    fieldTypes: _featureTypeProperties,
                    isFilterable: true,
                    filterHandler: function (key, val) {
                        var filter = key + '=' + (angular.isString(val) ? "'" + val + "'" : val);
                        var overrides = {
                            startDtg: moment(_query.params.startDtg),
                            endDtg: moment(_query.params.endDtg),
                            storeName: _query.params.storeName + ' (' + filter + ')',
                            currentLayer: _query.layerData.currentLayer
                        };
                        if (!_query.params.cql || _.trim(_query.params.cql) === '') {
                            overrides.cql = filter;
                        } else {
                            overrides.cql = _.trim(_query.params.cql) + ' AND ' + filter;
                        }
                        $rootScope.$emit('Launch Timelapse Wizard', overrides);
                    }
                });
            })
            .error(function (data, status, headers, config, statusText) { //eslint-disable-line no-unused-vars
                deferred.reject({
                    name: _thisStore.getName(),
                    isError: true,
                    reason: statusText
                });
            });
            return deferred.promise;
        };

        this.searchPointAndTime = function (coord, res, startMillis, endMillis) {
            var deferred = $q.defer();
            var boundedStartMillis = boundStartMillis(startMillis);
            var boundedEndMillis = boundEndMillis(endMillis);
            var KeywordConfig = _query.layerData.currentLayer.KeywordConfig;
            var clickOverrides = {
                fixedPixelBuffer: Math.max(this.getPointRadius(), 4)
            };
            _.merge(clickOverrides, clickSearchHelper.getLayerOverrides(KeywordConfig));

            var capabilities = KeywordConfig.capability || {};
            capabilities = queryBinStoreExtender.extendCapabilities(capabilities, this, {
                startMillis: boundedStartMillis,
                endMillis: boundedEndMillis
            });

            if (this.hasLabel()) {
                var label = _query.layerData.currentLayer.fieldNames.label || 'label';
                var labels = _.pluck(this.searchPointAndTimeForRecords(coord, res, startMillis, endMillis), 'label');
                if (labels.length > 0) {
                    var cql = label + ' IN (' + labels.join() + ')';
                    return searchPointAndTimeWithCql(cql, capabilities, coord, clickOverrides);
                } else {
                    return $q.when({name: this.getName(), records: []}); //empty results
                }
            } else {
                var extent = clickSearchHelper.getSearchExtent(coord, res, clickOverrides);
                var cqlParams = {
                    params: {
                        geomField: _query.params.geomField,
                        dtgField: _query.params.dtgField,
                        minLon: Math.max(extent[0], _query.params.minLon),
                        minLat: Math.max(extent[1], _query.params.minLat),
                        maxLon: Math.min(extent[2], _query.params.maxLon),
                        maxLat: Math.min(extent[3], _query.params.maxLat),
                        startDtg: moment.utc(boundedStartMillis),
                        endDtg: moment.utc(boundedEndMillis),
                        cql: _query.params.cql
                    }
                };

                if (_thisStore.getMinTimeInMillis() > endMillis ||
                    _thisStore.getMaxTimeInMillis() < startMillis ||
                    cqlParams.params.minLat > cqlParams.params.maxLat ||
                    cqlParams.params.minLon > cqlParams.params.maxLon) {
                    deferred.resolve({
                        name: _thisStore.getName(),
                        isError: false,
                        records: []
                    });
                    return deferred.promise;
                }

                return searchPointAndTimeWithCql(cqlHelper.buildSpaceTimeFilter(cqlParams.params), capabilities, coord, clickOverrides);
            }
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
                    'cql_filter=' + cqlHelper.buildSpaceTimeFilter(_query.params)
                ].join('&'));
            }
        };
    };

    QueryBinStore.prototype = Object.create(BinStore.prototype);

    return QueryBinStore;
}])

.service('queryBinStoreExtender', [
'coreCapabilitiesExtender',
'stealth.core.popup.capabilities.Extender',
function (coreCapabilitiesExtender, Extender) {
    Extender.apply(this);

    var extendCapabilities = this.extendCapabilities;
    this.extendCapabilities = function (capabilities, thisArg, opts) {
        return extendCapabilities(coreCapabilitiesExtender.extendCapabilities(capabilities, thisArg, opts),
            thisArg, opts);
    };
}])
;
