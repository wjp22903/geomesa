angular.module('stealth.timelapse.stores', [
    'stealth.core.geo.ows',
    'stealth.core.popup.capabilities',
    'stealth.core.utils'
])

.factory('stealth.timelapse.stores.QueryBinStore', [
'$log',
'$rootScope',
'$q',
'cqlHelper',
'clickSearchHelper',
'CONFIG',
'wfs',
'queryBinStoreExtender',
'stealth.timelapse.stores.LineQueryBinStore',
function ($log, $rootScope, $q, cqlHelper, clickSearchHelper,
          CONFIG, wfs, queryBinStoreExtender, LineQueryBinStore) {
    var tag = 'stealth.timelapse.stores.QueryBinStore: ';
    $log.debug(tag + 'factory started.');

    var QueryBinStore = function () {
        LineQueryBinStore.apply(this, arguments);
        $log.debug(tag + 'new QueryBinStore(' + this.getName() + ')');

        var _thisStore = this;

        this.buildSpaceTimeFilter = function () {
            var query = this.getQuery();
            return cqlHelper.buildSpaceTimeFilter(query.params);
        };

        this.buildGetFeatureOverrides = function () {
            var query = this.getQuery();
            var geom = query.params.geomField.name;
            var dtg = query.params.dtgField.name;
            var id = query.params.idField.name;
            var label = query.layerData.currentLayer.fieldNames.label;
            return {
                propertyName: _.compact([dtg, geom, id, label]).join(),
                outputFormat: 'application/vnd.binary-viewer',
                format_options: 'geom:' + geom + ';dtg:' + dtg + ';trackId:' + id + (label ? ';label:' + label : '') +
                    (query.params.sortOnServer ? ';sort=true' : ''),
                cql_filter: this.buildSpaceTimeFilter()
            };
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

            var typeName = _thisStore.getQuery().layerData.currentLayer.Name;
            wfs.getFeature(CONFIG.geoserver.defaultUrl, typeName, CONFIG.geoserver.omitProxy, overrides)
            .success(function (data, status, headers, config, statusText) { //eslint-disable-line no-unused-vars
                var trimmedFeatures = clickSearchHelper.sortAndTrimFeatures(coord, data.features, clickOverrides);
                var omitKeys = _.keys(_.get(_thisStore.getQuery().layerData.currentLayer.KeywordConfig, 'field.hide'));
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
                    fieldTypes: _thisStore.getQuery().featureTypeData.featureTypes[0].properties,
                    isFilterable: true,
                    filterHandler: function (key, val) {
                        var filter = key + '=' + (angular.isString(val) ? "'" + val + "'" : val);
                        var overrides = {
                            startDtg: moment(_thisStore.getQuery().params.startDtg),
                            endDtg: moment(_thisStore.getQuery().params.endDtg),
                            storeName: _thisStore.getQuery().params.storeName + ' (' + filter + ')',
                            currentLayer: _thisStore.getQuery().layerData.currentLayer
                        };
                        if (!_thisStore.getQuery().params.cql || _.trim(_thisStore.getQuery().params.cql) === '') {
                            overrides.cql = filter;
                        } else {
                            overrides.cql = _.trim(_thisStore.getQuery().params.cql) + ' AND ' + filter;
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
            var KeywordConfig = _thisStore.getQuery().layerData.currentLayer.KeywordConfig;
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
                var label = _thisStore.getQuery().layerData.currentLayer.fieldNames.label || 'label';
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
                        geomField: _thisStore.getQuery().params.geomField,
                        dtgField: _thisStore.getQuery().params.dtgField,
                        minLon: Math.max(extent[0], _thisStore.getQuery().params.minLon),
                        minLat: Math.max(extent[1], _thisStore.getQuery().params.minLat),
                        maxLon: Math.min(extent[2], _thisStore.getQuery().params.maxLon),
                        maxLat: Math.min(extent[3], _thisStore.getQuery().params.maxLat),
                        startDtg: moment.utc(boundedStartMillis),
                        endDtg: moment.utc(boundedEndMillis),
                        cql: _thisStore.getQuery().params.cql
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

        this.exportFormats = {
            'Binary': 'bin',
            'CSV': 'csv',
            'GML2': 'GML2',
            'GML3.1': 'text/xml; subtype=gml/3.1.1',
            'GML3.2': 'application/gml+xml; version=3.2',
            'GeoJSON': 'application/json',
            'KML': 'application/vnd.google-earth.kml+xml',
            'Shapefile': 'SHAPE-ZIP'
        };
    };

    QueryBinStore.prototype = Object.create(LineQueryBinStore.prototype);

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
