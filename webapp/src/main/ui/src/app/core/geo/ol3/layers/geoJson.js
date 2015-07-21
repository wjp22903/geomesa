angular.module('stealth.core.geo.ol3.layers', [
    'stealth.core.geo.ol3.format',
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
'stealth.core.geo.ol3.format.GeoJson',
'CONFIG',
function ($log, $q, wfs, colors, ol3Styles, clickSearchHelper, MapLayer, GeoJson, CONFIG) {
    var parser = new GeoJson();
    var tag = 'stealth.core.geo.ol3.layers.GeoJsonVectorLayer: ';
    $log.debug(tag + 'factory started');

    var GeoJsonVectorLayer = function (options) {
        var _options = options || {};
        var _self = this;
        var _isLoading = false;
        var _name = _options.name;
        var _layerThisBelongsTo = _options.layerThisBelongsTo;
        var _geoserverUrl = _options.geoserverUrl || CONFIG.geoserver.defaultUrl;
        var _requestParams = _options.requestParams || {};
        var _typeName = _layerThisBelongsTo.Name;
        var _omitSearchProps = _.keys(_.get(_layerThisBelongsTo.KeywordConfig, 'field.hide'));
        var _viewState = {
            toggledOn: true,
            isError: false,
            errorMsg: '',
            fillColor: colors.getColor(),
            size: 4
        };
        var _styleFunction = function (feature) {
            var style;
            switch (feature.getGeometry().getType()) {
                case ol.geom.GeometryType.MULTI_LINE_STRING:
                case ol.geom.GeometryType.LINEAR_RING:
                case ol.geom.GeometryType.LINE_STRING:
                    style = ol3Styles.getLineStyle(_viewState.size, _viewState.fillColor);
                    break;
                case ol.geom.GeometryType.MULTI_POLYGON:
                case ol.geom.GeometryType.CIRCLE:
                case ol.geom.GeometryType.POLYGON:
                    style = ol3Styles.getPolyStyle(_viewState.size, _viewState.fillColor);
                    break;
                case ol.geom.GeometryType.MULTI_POINT:
                case ol.geom.GeometryType.POINT:
                    style = ol3Styles.getPointStyle(_viewState.size, _viewState.fillColor);
                    break;
            }
            return style;
        };
        var _loadFeatures = function (features) {
            var parsedFeatures = parser.readFeatures(features);
            _olSource.clear(true);
            _olSource.addFeatures(parsedFeatures);
        };
        var _loadStart = function () {
            _self.styleDirectiveScope.$evalAsync(function () {
                _isLoading = true;
                _self.styleDirectiveScope.$emit(_self.id + ':isLoading');
                if (_.isFunction(_options.onLoad)) {
                    _options.onLoad.call(this);
                }
            });
        };
        var _loadEnd = function () {
            _self.styleDirectiveScope.$evalAsync(function () {
                _isLoading = false;
                _self.styleDirectiveScope.$emit(_self.id + ':finishedLoading');
            });
        };
        var _query = function () {
            _loadStart();
            wfs.getFeature(_geoserverUrl, _typeName, CONFIG.geoserver.omitProxy, _requestParams)
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
                        _loadFeatures(data);
                    }
                }
            })
            .error(function (data, status, headers, config, statusText) {
                var msg = 'HTTP status ' + status + ': ' + statusText;
                $log.error(tag + '(' + _name + ') ' + msg);
                _viewState.isError = true;
                _viewState.errorMsg = statusText;
            })['finally'](_loadEnd());
        };
        var _olSource = new ol.source.Vector({
            features: []
        });
        var _olLayer = new ol.layer.Vector({
            source: _olSource,
            style: _styleFunction
        });

        $log.debug(tag + 'new GeoJsonVectorLayer(' + arguments[0] + ')');
        MapLayer.apply(_self, [_name, _olLayer, _options.queryable, _options.zIndexHint]);
        _self.styleDirective = 'st-geo-json-vector-layer-style';
        _self.styleDirectiveScope.layer = _self;
        _self.styleDirectiveScope.sizeChanged = function (layer, size) {
            if (!angular.isNumber(size)) { // Prevents deleting number in input field.
                size = 1;
            }
            _olLayer.changed();
        };
        _self.styleDirectiveScope.fillColorChanged = function (layer, fillColor) {
            _olLayer.changed();
        };

        _self.getViewState = function () { return _viewState; };

        _self.getFeatures = function () { return _olSource.getFeatures(); };

        var getBaseCapabilities = this.getBaseCapabilities;
        _self.getBaseCapabilities = function () {
            return _.merge(_.cloneDeep(getBaseCapabilities()),
                _.get(_layerThisBelongsTo, 'KeywordConfig.capability')
            );
        };

        _self.updateRequestParams = function (params) {
            _.merge(_requestParams, params || {});
            _requestParams.unique = _.now();
            _query();
        };

        _self.applyCql = function (cql) {
            _self.updateRequestParams({
                CQL_FILTER: (_.isEmpty(cql) || _.isEmpty(cql.trim())) ? null : cql
            });
        };

        _self.isLoading = function () {
            return _isLoading;
        };

        _self.searchPoint = function (coord, resolution) {
            var baseResponse = _.merge(this.getEmptySearchPointResult(), {
                layerFill: {
                    color: _viewState.fillColor
                }
            });
            var clickOverrides = clickSearchHelper.getLayerOverrides(_layerThisBelongsTo.KeywordConfig);
            var extent = clickSearchHelper.getSearchExtent(coord, resolution, clickOverrides);
            var nearbyFeatures = [];
            var trimmedFeatures;

            // If this layer is not toggled on, ...
            if (!_viewState.toggledOn || _viewState.isError) {
                return $q.when(baseResponse);
            }

            _olSource.forEachFeatureIntersectingExtent(extent, function (feature) {
                nearbyFeatures.push(feature);
            });

            trimmedFeatures = clickSearchHelper.sortAndTrimFeatures(coord, nearbyFeatures, clickOverrides);
            return $q.when(_.merge(baseResponse, {
                isError: false,
                records: _.map(trimmedFeatures, function (feat, i) {
                    return _.omit(feat.getProperties(), _omitSearchProps.concat([feat.getGeometryName()]));
                })
            }));
        };

        _query();
    };
    GeoJsonVectorLayer.prototype = Object.create(MapLayer.prototype);

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
