angular.module('stealth.core.geo.ol3.layers', [
    'stealth.core.geo.ows',
    'stealth.core.utils'
])

.factory('stealth.core.geo.ol3.layers.GeoJsonVectorLayer', [
'$log',
'$q',
'wfs',
'colors',
'ol3Styles',
'clickSearchHelper',
'stealth.core.geo.ol3.layers.MapLayer',
'CONFIG',
function ($log, $q, wfs, colors, ol3Styles, clickSearchHelper, MapLayer, CONFIG) {
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

        var _olSource = new ol.source.Vector({
            loader: _loaderFunction
        });

        function _loadFeatures (features, proj) {
            var format = new ol.format.GeoJSON();
            var readOptions = {};
            if (!_.isUndefined(proj)) {
                readOptions['featureProjection'] = proj;
            }
            var parsedFeatures = format.readFeatures(features, readOptions);
            _olSource.addFeatures(parsedFeatures);
        }

        function _loaderFunction (extent, resolution, projection) {
            if (!_.isUndefined(_queryResponse)) {
                _loadFeatures(_queryResponse, projection);
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
            var overrides = {
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

        _self.getBaseCapabilities = function () {
            return _query.layerData.currentLayer.KeywordConfig.capability || {};
        };

        _self.searchPoint = function (coord, resolution) {
            var baseResponse = _.merge(this.getEmptySearchPointResult(), {
                layerFill: {
                    color: _viewState.fillColor
                }
            });
            var clickOverrides = clickSearchHelper.getLayerOverrides(_query.layerData.currentLayer.KeywordConfig);
            var extent = clickSearchHelper.getSearchExtent(coord, resolution, clickOverrides);
            var nearbyFeatures = [];
            var trimmedFeatures;

            // If this layer is not toggled on, ...
            if (!_viewState.toggledOn || _viewState.isError || _.isUndefined(_queryResponse)) {
                return $q.when(baseResponse);
            }

            _olSource.forEachFeatureIntersectingExtent(extent, function (feature) {
                nearbyFeatures.push(feature);
            });

            trimmedFeatures = clickSearchHelper.sortAndTrimFeatures(coord, nearbyFeatures, clickOverrides);
            var omitLayerProperties = _.keys(_.get(_query.layerData.currentLayer.KeywordConfig, 'field.hide'));
            return $q.when(_.merge(baseResponse, {
                isError: false,
                records: _.map(trimmedFeatures, function (feat, i) {
                    return _.omit(feat.getProperties(), omitLayerProperties.concat([feat.getGeometryName()]));
                })
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
