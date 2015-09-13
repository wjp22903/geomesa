angular.module('stealth.p2p.geo.query', [
    'stealth.core.geo.ows'
])
.factory('stealth.p2p.geo.query.P2PQuery', [
'$q',
'$filter',
'cookies',
'wfs',
'ol3Map',
'owsLayers',
'CONFIG',
function ($q, $filter, cookies, wfs, ol3Map, owsLayers, CONFIG) {
    var idSeq = 1;
    var now = moment().utc();
    var oneWeekAgo = now.clone().subtract(7, 'days');

    var P2PQuery = function () {
        var _self = this;

        _self.layerData = {};
        _self.pointLayers = [];
        _self.params = {
            title: 'P2PQuery ' + idSeq++,
            layer: null,
            geomField: null,
            dtgField: null,
            maxLat: 90,
            minLat: -90,
            maxLon: 180,
            minLon: -180,
            startDtg: oneWeekAgo,
            endDtg: now,
            cql: null,
            sortField: null,
            groupingField: null,
            minNumPoints: 5,
            breakOnDay: false,
            lineWidth: 2,
            arrowSize: 5
        };

        this.isPointLayer = function (layer) {
            return wfs.getFeatureTypeDescription(CONFIG.geoserver.defaultUrl,
                                          layer.Name,
                                          CONFIG.geoserver.omitProxy)
                .then(
                    function (data) {
                        if (data.error || (angular.isString(data) && data.indexOf('Exception') !== -1)) {
                            return false;
                        } else {
                            var ftd = data;
                            if (ftd.featureTypes !== undefined && ftd.featureTypes.length > 0) {
                                if (_.some(ftd.featureTypes[0].properties, {'localType': 'Point'})) {
                                    _self.pointLayers.push(layer);
                                }
                            } else {
                                return false;
                            }
                        }
                    }
                );
        };

        this.getFeatureTypeDescription = function () {
            _self.layerData.error = null;
            _self.featureTypeData = null;
            _self.params.geomField = null;
            _self.params.dtgField = null;
            _self.params.sortField = null;
            _self.params.groupingField = null;

            wfs.getFeatureTypeDescription(CONFIG.geoserver.defaultUrl,
                                          _self.layerData.currentLayer.Name,
                                          CONFIG.geoserver.omitProxy)
            .then(
                function (data) {
                    _self.featureTypeData = data;
                    if (data.error || (angular.isString(data) && data.indexOf('Exception') !== -1)) { // Response is successful,
                                      // but no description is
                                      // found for the type.
                        _self.featureTypeData = 'unavailable';
                    } else {
                        var dtg = _.find(_self.featureTypeData.featureTypes[0].properties, {'name': _self.layerData.currentLayer.fieldNames.dtg});
                        if (dtg !== undefined) {
                            _self.params.dtgField = dtg;
                        }
                        var sortField = _.find(_self.featureTypeData.featureTypes[0].properties, {'name': _self.layerData.currentLayer.fieldNames.sortField});
                        if (sortField !== undefined) {
                            _self.params.sortField = sortField;
                        } else {
                            _self.params.sortField = dtg;
                        }
                        var geom = _.find(_self.featureTypeData.featureTypes[0].properties, {'name': _self.layerData.currentLayer.fieldNames.geom});
                        if (geom !== undefined) {
                            _self.params.geomField = geom;
                        }
                        var group = _.find(_self.featureTypeData.featureTypes[0].properties, {'name': _self.layerData.currentLayer.fieldNames.groupingField});
                        if (group !== undefined) {
                            _self.params.groupingField = group;
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
                //Save cookie - expires in a year
                cookies.put('p2p.wizard.bbox', 0, bbox, moment.utc().add(1, 'y'));
            }
        };

        var keywordPrefix = ['p2p'];
        owsLayers.getLayers(null, true)
            .then(function (layers) {
                return $q.all(_.map(layers, _self.isPointLayer));
            }).then(function () {
                _self.layerData.layers = _.sortBy(_self.pointLayers, 'Title');
                _.each(_self.layerData.layers, function (layer) {
                    _.each(_.keys(_.get(layer.KeywordConfig, keywordPrefix)), function (workspace) {
                        layer.fieldNames = _.merge({
                            groupingField: 'groupingField',
                            sortField: 'sortField',
                            geom: 'geom',
                            dtg: 'dtg'
                        }, _.get(layer.KeywordConfig, keywordPrefix.concat([workspace, 'field'])));
                    });
                });
                if (!_.isEmpty(_self.layerData.layers)) {
                    if (_self.params.currentLayer) {
                        _self.layerData.currentLayer = _.find(_self.layerData.layers, {'Name': _self.params.currentLayer.Name});
                    }
                    _self.layerData.currentLayer = _self.layerData.currentLayer || _self.layerData.layers[0];
                    _self.getFeatureTypeDescription();
                }
                //Initialize values
                _self.checkAndSetBounds(ol3Map.getExtent(), true);
                _.merge(
                    _self.params,
                    cookies.get('p2p.wizard.bbox', 0)
                );
                _self.checkAndSetBounds([_self.params.minLon, _self.params.minLat, _self.params.maxLon, _self.params.maxLat], true);
            });
    };

    return P2PQuery;
}])
;

