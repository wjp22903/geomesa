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
    var parser = new GeoJson(); // stealth GeoJson, extending OL3 for STEALTH-319
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
        var _extraStyleBuilder = _options.extraStyleBuilder;
        var _typeName = _layerThisBelongsTo.Name;
        var _omitSearchProps = _.keys(_.get(_layerThisBelongsTo.KeywordConfig, 'field.hide'));
        var _viewState = {
            toggledOn: true,
            isError: false,
            errorMsg: '',
            fillColor: colors.getColor(),
            size: 4
        };
        var _styleFunction = options.styleFn || function (feature) {
            var style = [];
            switch (feature.getGeometry().getType()) {
                case 'MultiLineString':
                case 'LinearRing':
                case 'LineString':
                    style.push(ol3Styles.getLineStyle(_viewState.size, _viewState.fillColor));
                    break;
                case 'MultiPolygon':
                case 'Circle':
                case 'Polygon':
                    style.push(ol3Styles.getPolyStyle(_viewState.size, _viewState.fillColor));
                    break;
                case 'MultiPoint':
                case 'Point':
                    style.push(ol3Styles.getPointStyle(_viewState.size, _viewState.fillColor));
                    break;
            }
            if (_.isFunction(_extraStyleBuilder)) {
                Array.prototype.push.apply(style, _extraStyleBuilder(_viewState.size, _viewState.fillColor));
            }
            return style;
        };
        var _olSource = new ol.source.Vector({
            features: []
        });
        var _loadFeatures = function (features) {
            var existingFeatures = _olSource.getFeatures();
            _.each(features, function (feature) {
                var featureId = feature.getId();
                var existingFeature = _.find(existingFeatures, function (ef) {
                    return ef.getId() === featureId;
                });
                if (!_.isUndefined(existingFeature)) {
                    _.pull(existingFeatures, existingFeature);
                    existingFeature.setGeometry(feature.getGeometry());
                    existingFeature.setProperties(feature.getProperties());
                } else {
                    _olSource.addFeature(feature);
                }
            });
            _.each(existingFeatures, function (feature) {
                _olSource.removeFeature(feature);
            });
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
        var _query = options.queryFn || function () {
            _loadStart();
            wfs.getFeature(_geoserverUrl, _typeName, CONFIG.geoserver.omitProxy, _requestParams)
            .success(function (data, status, headers) { //eslint-disable-line no-unused-vars
                var contentType = headers('content-type');
                if (contentType.indexOf('xml') > -1) {
                    $log.error(tag + '(' + _name + '): ' + data);
                    _viewState.isError = true;
                    _viewState.errorMsg = 'ows.ExceptionReport returned';
                } else if (data.totalFeatures < 1) {
                    $log.error(tag + '(' + _name + ') No results');
                    _viewState.isError = true;
                    _viewState.errorMsg = 'No results';
                } else {
                    var parsedFeatures = parser.readFeatures(data);
                    _loadFeatures(parsedFeatures);
                }
            })
            .error(function (data, status, headers, config, statusText) { //eslint-disable-line no-unused-vars
                var msg = 'HTTP status ' + status + ': ' + statusText;
                $log.error(tag + '(' + _name + ') ' + msg);
                _viewState.isError = true;
                _viewState.errorMsg = statusText;
            })['finally'](_loadEnd());
        };
        var _olLayer = new ol.layer.Vector({
            source: _olSource,
            style: _styleFunction
        });

        $log.debug(tag + 'new GeoJsonVectorLayer(' + arguments[0] + ')');
        MapLayer.apply(_self, [_name, _olLayer, _options.queryable, _options.zIndexHint]);
        _self.styleDirective = 'st-geo-json-vector-layer-style';
        _self.styleDirectiveScope.layer = _self;
        _self.styleDirectiveScope.sizeChanged = function (size) {
            if (!angular.isNumber(size)) { // Prevents deleting number in input field.
                size = 1;
            }
            _olLayer.changed();
        };
        _self.styleDirectiveScope.fillColorChanged = function () {
            _olLayer.changed();
        };

        _self.getViewState = function () { return _viewState; };

        _self.getSource = function () { return _olSource; };

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
                getLayerLegendStyle: function () {
                    return {color: _viewState.fillColor};
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
                records: _.map(trimmedFeatures, function (feat) {
                    return _.omit(feat.getProperties(), _omitSearchProps.concat([feat.getGeometryName()]));
                }),
                features: trimmedFeatures
            }));
        };

        this.loadStart = _loadStart;
        this.loadEnd = _loadEnd;
        this.loadFeatures = _loadFeatures;
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
