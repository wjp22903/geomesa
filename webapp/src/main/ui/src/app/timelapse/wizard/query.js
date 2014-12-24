angular.module('stealth.timelapse.wizard.query', [
    'stealth.timelapse',
    'stealth.timelapse.stores'
])

.service('queryService', [
'$log',
'tlLayerManager',
'CONFIG',
'wfs',
'stealth.timelapse.stores.BinStore',
function ($log, tlLayerManager, CONFIG, wfs, BinStore) {

    function buildCQLFilter(query) {
        var cql_filter =
            'BBOX(' + query.params.geomField.name + ',' +
            query.params.minLat + ',' + query.params.minLon + ',' +
            query.params.maxLat + ',' + query.params.maxLon + ')' +
            ' AND ' + query.params.dtgField.name + ' DURING ' +
            moment(query.params.startDate).format('YYYY-MM-DD') + 'T' +
            moment(query.params.startTime).format('HH:mm') + ':00.000Z' +
            '/' +
            moment(query.params.endDate).format('YYYY-MM-DD') + 'T' +
            moment(query.params.endTime).format('HH:mm') + ':59.999Z ';
        if (query.params.cql) {
            cql_filter += ' AND ' + query.params.cql;
        }
        return cql_filter;
    }

    this.launchBinQuery = function (query) {
        var url = query.serverData.currentGeoserverUrl + '/' + query.layerData.currentLayer.prefix;
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
                    //TODO: Hook this in to the new layer explorer.
                    $log.error('Malformed query');
                } else {
                    // 'data' expected to be of type ArrayBuffer.
                    if (data.byteLength === 0) {
                        //TODO: Hook this in to the new layer explorer.
                        $log.error('No Results');
                    } else {
                        //TODO: Add streaming query capability
                        var binStore = new BinStore(data, storeName);
                        tlLayerManager.getHistoricalLayer().addStore(binStore);
                    }
                }
            })
            .error(function(data, status, headers, config, statusText) {
                //TODO: Hook this in to the new layer explorer.
                $log.error('HTTP status ' + status + ': ' + statusText);
            })
        ;
    };
}])

.factory('stealth.timelapse.wizard.Query', [
'CONFIG',
'wfs',
function (CONFIG, wfs) {
    var now = new Date();
    var oneWeekAgo = new Date();
    var noTime = new Date();

    oneWeekAgo.setDate(now.getDate() - 7);
    noTime.setHours(0);
    noTime.setMinutes(0);

    var startDate = oneWeekAgo;
    var endDate = now;
    var startTime = _.cloneDeep(startDate);
    var endTime = _.cloneDeep(endDate);
    var query = function () {
        var _self = this;

        this.serverData = {
            // The value the user enters into the form.
            proposedGeoserverUrl: CONFIG.geoserver.defaultUrl,
            // The value after the user clicks 'Choose'.
            currentGeoserverUrl: null,
            error: null
        };
        this.layerData = {};
        this.params = {
            idField: null,
            geomField: null,
            dtgField: null,
            storeName: null,
            maxLat: null,
            minLat: null,
            maxLon: null,
            minLon: null,
            isStartCalOpen: false,
            startDate: startDate,
            isEndCalOpen: false,
            endDate: endDate,
            startTime: startTime,
            endTime: endTime,
            cql: null,
            type: 'static'
        };

        this.toggleCalendar = function ($event, isOpen) {
            $event.preventDefault();
            $event.stopPropagation();
            return !isOpen;
        };

        this.clearStartDatetime = function () {
            _self.params.startDate = null;
            _self.params.startTime = _.cloneDeep(noTime);
        };

        this.clearEndDatetime = function () {
            _self.params.endDate = null;
            _self.params.endTime = _.cloneDeep(noTime);
        };

        this.updateServer = function () {
            _self.serverData.error = null;
            _self.serverData.currentGeoserverUrl = null;
            _self.layerData = {};

            wfs.getCapabilities(_self.serverData.proposedGeoserverUrl,
                                _self.serverData.proposedGeoserverUrl === CONFIG.geoserver.defaultUrl ?
                                    CONFIG.geoserver.omitProxy : false)
            .then(
                function (data) {
                    _self.layerData.layers =
                        _.flatten(_.pluck(_.pluck(data, 'featureTypeList'), 'featureTypes'), true);
                    _self.serverData.currentGeoserverUrl = _self.serverData.proposedGeoserverUrl;
                },
                function (error) {
                    // The GetCapabilities request failed.
                    _self.serverData.error =
                        'GetCapabilities request failed. Error: ' +
                        error.status + ' ' + error.statusText;
                }
            );
        };

        // Invoked when the current selected layer changes on query form.
        this.getFeatureTypeDescription = function () {
            _self.layerData.error = null;
            _self.featureTypeData = null;
            _self.params.idField = null;
            _self.params.geomField = null;
            _self.params.dtgField = null;

            wfs.getFeatureTypeDescription(_self.serverData.currentGeoserverUrl,
                                          _self.layerData.currentLayer.name,
                                          _self.serverData.currentGeoserverUrl === CONFIG.geoserver.defaultUrl ?
                                              CONFIG.geoserver.omitProxy : false)
            .then(
                function (data) {
                    _self.featureTypeData = data;
                    if (data.error) { // Response is successfull,
                                      // but no description is
                                      // found for the type.
                        _self.featureTypeData = 'unavailable';
                    } else {
                        var dtg = _.find(_self.featureTypeData.featureTypes[0].properties, {'name': 'dtg'});
                        if (dtg !== undefined) {
                            _self.params.dtgField = dtg;
                        }
                        var geom = _.find(_self.featureTypeData.featureTypes[0].properties, {'name': 'geom'});
                        if (geom !== undefined) {
                            _self.params.geomField = geom;
                        }
                    }
                },
                function (error) {
                    _self.layerData.error =
                        'GetFeatureTypeDescription request failed. Error: ' +
                        error.status + ' ' + error.statusText;
                }
            );
        };
    };

    return query;
}])
;
