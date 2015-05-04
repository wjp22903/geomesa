angular.module('stealth.timelapse.wizard.query', [
    'stealth.timelapse',
    'stealth.timelapse.stores'
])

.service('queryService', [
'$rootScope',
'tlLayerManager',
'stealth.timelapse.stores.QueryBinStore',
function ($rootScope, tlLayerManager, QueryBinStore) {
    var hLayer;

    this.launchBinQuery = function (query) {
        hLayer = tlLayerManager.getHistoricalLayer();
        var name = query.params.storeName;
        var store = new QueryBinStore(name);
        hLayer.addStore(store);
        store.launchQuery(query);
    };

    $rootScope.$on('timelapse:querySuccessful', function () {
        hLayer.setDtgBounds();
    });
}])

.factory('stealth.timelapse.wizard.Query', [
'wfs',
'owsLayers',
'CONFIG',
function (wfs, owsLayers, CONFIG) {
    var idSeq = 1;

    var query = function (overrides) {
        var _self = this;
        var now = moment().utc();
        var defaultTimeWindow = now.clone().subtract(3, 'hours');

        this.layerData = {};
        this.timeData = {
            range: 3,
            isCustom: false
        };
        this.params = {
            idField: null,
            geomField: null,
            dtgField: null,
            storeName: 'History ' + idSeq++,
            maxLat: 90,
            minLat: -90,
            maxLon: 180,
            minLon: -180,
            startDtg: defaultTimeWindow,
            endDtg: now,
            cql: null
        };
        _.merge(this.params, overrides);
        if (overrides && !(_.isUndefined(overrides.startDtg) && _.isUndefined(overrides.endDtg))) {
            var hourDiff = moment.duration(this.params.endDtg.diff(this.params.startDtg)).asHours();
            switch (hourDiff) {
                case 3:
                case 6:
                case 12:
                    this.timeData.range = hourDiff;
                    break;
                default:
                    this.timeData.range = 'Custom';
                    this.timeData.isCustom = true;
            }
        }

        var keywordPrefix = ['timelapse', 'historical'];
        owsLayers.getLayers(keywordPrefix)
            .then(function (layers) {
                _self.layerData.layers = _.sortBy(layers, 'Title');
                _.each(_self.layerData.layers, function (layer) {
                    _.each(_.deepGet(layer.KeywordConfig, keywordPrefix), function (conf, workspace) {
                        layer.fieldNames = _.merge({
                            trkId: 'trkId',
                            geom: 'geom',
                            dtg: 'dtg'
                        }, _.deepGet(layer.KeywordConfig, keywordPrefix.concat([workspace, 'field'])));
                    });
                });
                if (!_.isEmpty(_self.layerData.layers)) {
                    if (_self.params.currentLayer) {
                        _self.layerData.currentLayer = _.find(_self.layerData.layers, {'Name': _self.params.currentLayer.Name});
                    }
                    _self.layerData.currentLayer = _self.layerData.currentLayer || _self.layerData.layers[0];
                    _self.getFeatureTypeDescription();
                }
            });

        this.updateTimeRange = function (range) {
            if (_.isNumber(range)) {
                this.params.endDtg = now;
                this.params.startDtg = now.clone().subtract(range, 'hours');
                this.timeData.isCustom = false;
                this.timeData.range = range;
            } else {
                this.timeData.isCustom = true;
                this.timeData.range = 'Custom';
            }
        };

        // Invoked when the current selected layer changes on query form.
        this.getFeatureTypeDescription = function () {
            _self.layerData.error = null;
            _self.featureTypeData = null;
            _self.params.idField = null;
            _self.params.geomField = null;
            _self.params.dtgField = null;

            wfs.getFeatureTypeDescription(CONFIG.geoserver.defaultUrl,
                                          _self.layerData.currentLayer.Name,
                                          CONFIG.geoserver.omitProxy)
            .then(
                function (data) {
                    _self.featureTypeData = data;
                    if (data.error) { // Response is successful,
                                      // but no description is
                                      // found for the type.
                        _self.featureTypeData = 'unavailable';
                    } else {
                        var id = _.find(_self.featureTypeData.featureTypes[0].properties, {'name': _self.layerData.currentLayer.fieldNames.trkId});
                        if (id !== undefined) {
                            _self.params.idField = id;
                        }
                        var dtg = _.find(_self.featureTypeData.featureTypes[0].properties, {'name': _self.layerData.currentLayer.fieldNames.dtg});
                        if (dtg !== undefined) {
                            _self.params.dtgField = dtg;
                        }
                        var geom = _.find(_self.featureTypeData.featureTypes[0].properties, {'name': _self.layerData.currentLayer.fieldNames.geom});
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
