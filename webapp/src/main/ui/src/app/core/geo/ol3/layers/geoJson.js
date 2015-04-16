angular.module('stealth.core.geo.ol3.layers', [
    'stealth.core.geo.ows'
])

.factory('stealth.core.geo.ol3.layers.GeoJsonVectorLayer', [
'$log',
'$q',
'wfs',
'colors',
'ol3Styles',
'stealth.core.geo.ol3.layers.MapLayer',
'CONFIG',
function ($log, $q, wfs, colors, ol3Styles, MapLayer, CONFIG) {
    var tag = 'stealth.core.geo.ol3.layers.GeoJsonVectorLayer: ';
    $log.debug(tag + 'factory started');

    var GeoJsonVectorLayer = function (name, zIndexHint) {
        var _self = this;

        var _name = name;

        var _query;
        var _queryResponse;

        var _viewState = {
            toggledOn: true,
            isError: false,
            errorMsg: '',
            fillColor: colors.getColor(),
            size: 4
        };
        _viewState.isDataPending = function () {
            return !_viewState.isError && _.isUndefined(_queryResponse);
        };
        _viewState.isDataReady = function () {
            return !_viewState.isError && !_.isUndefined(_queryResponse);
        };

        var _olSource = new ol.source.ServerVector({
            format: new ol.format.GeoJSON(),
            loader: _loaderFunction
        });

        function _loadFeatures (features) {
            _olSource.addFeatures(_olSource.readFeatures(features));
        }

        function _loaderFunction (extent, resolution, projection) {
            if (!_.isUndefined(_queryResponse)) {
                _loadFeatures(_queryResponse);
            } else {
                _loadFeatures('{"type":"FeatureCollection","totalFeatures":0,"features":[]}');
            }
        }

        var _olLayer = new ol.layer.Vector({
            source: _olSource,
            style: ol3Styles.getLineStyle(_viewState.size, _viewState.fillColor)
        });

        $log.debug(tag + 'new GeoJsonVectorLayer(' + arguments[0] + ')');
        MapLayer.apply(_self, [_name, _olLayer, true, zIndexHint]);
        _self.styleDirective = 'st-geo-json-vector-layer-style';
        _self.styleDirectiveScope.layer = _self;
        _self.styleDirectiveScope.sizeChanged = function (layer, size) {
            if (!angular.isNumber(size)) { // Prevents deleting number in input field.
                size = 1;
            }
            layer.getOl3Layer().setStyle(ol3Styles.getLineStyle(size, layer.getViewState().fillColor));
        };
        _self.styleDirectiveScope.fillColorChanged = function (layer, fillColor) {
            layer.getOl3Layer().setStyle(ol3Styles.getLineStyle(layer.getViewState().size, fillColor));
        };

        _self.launchQuery = function (query) {
            _query = query;
            var url = query.serverData.currentGeoserverUrl + '/' +
                      query.layerData.currentLayer.prefix;
            var typeName = query.layerData.currentLayer.name;
            var geom = query.params.geomField.name;
            var id = query.layerData.currentLayer.trkIdField;
            var overrides = {
                propertyName: geom + ',' + id,
                cql_filter: buildCQLFilter(query)
            };

            wfs.getFeature(url, typeName, CONFIG.geoserver.omitProxy, overrides)
            .success(function (data, status, headers, config, statusText) {
                var contentType = headers('content-type');
                if (contentType.indexOf('xml') > -1) {
                    $log.error(tag + '(' + _name + '): ' + data);
                    _viewState.isError = true;
                    _viewState.errorMsg = 'ows.ExceptionReport returned';
                } else {
                    if (data.totalFeatures < 1) {
                        $log.error(tag + '(' + _name + ') No results');
                        _viewState.isError = true;
                        _viewState.errorMsg = 'No results';
                    } else {
                        _queryResponse = data;
                        _loadFeatures(_queryResponse);
                    }
                }
            })
            .error(function (data, status, headers, config, statusText) {
                var msg = 'HTTP status ' + status + ': ' + statusText;
                $log.error(tag + '(' + _name + ') ' + msg);
            });
        };

        _self.getViewState = function () { return _viewState; };

        _self.searchPoint = function (coord, resolution) {
            var baseResponse = _.merge(this.getEmptySearchPointResult(), {
                layerFill: {
                    color: _viewState.fillColor
                }
            });

            // If this layer is not toggled on, ...
            if (!_viewState.toggledOn || _viewState.isError || _.isUndefined(_queryResponse)) {
                return $q.when(baseResponse);
            }

            var factor = 10;
            var lon = coord[0];
            var lat = coord[1];
            var extent = [
                lon - factor * resolution,
                lat - factor * resolution,
                lon + factor * resolution,
                lat + factor * resolution
            ];
            var nearbyFeatures = [];

            var ol2Parser = new OpenLayers.Format.GeoJSON();
            var ol3Parser = new ol.format.GeoJSON();
            var bounds = new OpenLayers.Bounds(extent).toGeometry();
            _olSource.forEachFeature(function (feature) {
                var geometry = ol2Parser.read(ol3Parser.writeGeometry(feature.getGeometry()), 'Geometry');
                if (bounds.intersects(geometry)) {
                    nearbyFeatures.push(feature);
                }
            });

            return $q.when(_.merge(baseResponse, {
                isError: false,
                records: _.map(nearbyFeatures, function (feat, i) { return _.omit(feat.getProperties(), 'geometry'); }),
                capabilities: _query.layerData.currentLayer.KeywordConfig.capability || {}
            }));
        };
    };
    GeoJsonVectorLayer.prototype = Object.create(MapLayer.prototype);

    function buildCQLFilter (query) {
        var cql_filter = 'INCLUDE';
        cql_filter = '(' +
                     query.layerData.currentLayer.trkIdField +
                     '=\'' +
                     query.layerData.currentLayer.trkId +
                     '\')';

        return cql_filter;
    }

    return GeoJsonVectorLayer;
}])

.directive('stGeoJsonVectorLayerStyle', [
'$log',
function ($log) {
    $log.debug('stealth.core.geo.ol3.layers.stGeoJsonVectorLayerStyle: directive defined');
    return {
        templateUrl: 'core/geo/ol3/layers/geojsonvectorstyleview.tpl.html'
    };
}])

;
