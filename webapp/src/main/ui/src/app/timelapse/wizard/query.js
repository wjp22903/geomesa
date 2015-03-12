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
        store.setSummaryQueryCallback(tlLayerManager.getSummaryExploreManager().summaryQuery);
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
    var now = moment().utc();
    var oneWeekAgo = now.clone().subtract(7, 'days');

    var query = function () {
        var _self = this;

        this.layerData = {};
        this.params = {
            idField: null,
            geomField: null,
            dtgField: null,
            storeName: 'History ' + idSeq++,
            maxLat: 90,
            minLat: -90,
            maxLon: 180,
            minLon: -180,
            startDtg: oneWeekAgo,
            endDtg: now,
            cql: null
        };

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
                    _self.layerData.currentLayer = _self.layerData.layers[0];
                    _self.getFeatureTypeDescription();
                }
            });

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
