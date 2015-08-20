angular.module('stealth.timelapse.wizard.live', [
    'stealth.core.utils',
    'stealth.core.utils.cookies'
])

.factory('stealth.timelapse.wizard.live.Query', [
'cookies',
'cqlHelper',
'wfs',
'owsLayers',
'stealth.core.geo.ol3.format.GeoJson',
'CONFIG',
function (cookies, cqlHelper, wfs, owsLayers, GeoJson, CONFIG) {
    var idSeq = 1;
    var query = function () {
        var _self = this;
        var id = idSeq++;
        var geoJsonFormat = new GeoJson(); // stealth GeoJson, extending OL3 for STEALTH-319

        this.layerData = {};
        this.params = {
            storeName: 'Live (' + id + ')',
            geomField: null,
            geoFeature: null,
            cql: null
        };

        var geoFeatureJsonObj = cookies.get('timelapse.wizard.live.area', 0);
        if (geoFeatureJsonObj) {
            var geoFeature = geoJsonFormat.readFeature(geoFeatureJsonObj);
            if (geoFeature) {
                this.params.geoFeature = geoFeature;
            }
        }

        this.buildCql = function () {
            var geoBound = this.params.geoFeature ? 'INTERSECTS(' + (this.params.geomField || 'geom') +
                ', ' + (new ol.format.WKT()).writeFeature(this.params.geoFeature) + ')' : null;
            return cqlHelper.combine(cqlHelper.operator.AND, this.params.cql, geoBound);
        };

        this.saveSearchAreaCookie = function () {
            if (this.params.geoFeature) {
                cookies.put('timelapse.wizard.live.area', 0,
                    geoJsonFormat.writeFeatureObject(this.params.geoFeature),
                    moment.utc().add(1, 'y'));
            }
        };

        // Invoked when the current selected layer changes on query form.
        this.getFeatureTypeDescription = function () {
            _self.layerData.error = null;
            _self.featureTypeData = null;
            _self.params.geomField = null;

            _self.params.storeName = _self.layerData.currentLayer.Title + ' (' + id + ')';
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
                        wfs.getDefaultGeometryFieldName(CONFIG.geoserver.defaultUrl, _self.layerData.currentLayer.Name, CONFIG.geoserver.omitProxy)
                        .then(function (geomField) {
                            _self.params.geomField = geomField;
                        });
                    }
                },
                function (error) {
                    _self.layerData.error =
                        'GetFeatureTypeDescription request failed. Error: ' +
                        error.status + ' ' + error.statusText;
                }
            );
        };

        var keywordPrefix = ['timelapse', 'live'];
        owsLayers.getLayers(keywordPrefix)
            .then(function (layers) {
                _self.layerData.layers = _.sortBy(layers, 'Title');
                if (!_.isEmpty(_self.layerData.layers)) {
                    if (_self.params.currentLayer) {
                        _self.layerData.currentLayer = _.find(_self.layerData.layers, {'Name': _self.params.currentLayer.Name});
                    }
                    _self.layerData.currentLayer = _self.layerData.currentLayer || _self.layerData.layers[0];
                    _self.getFeatureTypeDescription();
                }
            });
    };

    return query;
}])
;
