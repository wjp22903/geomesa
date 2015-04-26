angular.module('stealth.core.geo.ol3.layers')

.factory('stealth.core.geo.ol3.layers.WmsLayer', [
'$log',
'$timeout',
'$http',
'$filter',
'stealth.core.geo.ol3.layers.MapLayer',
'CONFIG',
function ($log, $timeout, $http, $filter, MapLayer, CONFIG) {
    var tag = 'stealth.core.geo.ol3.layers.WmsLayer: ';
    $log.debug(tag + 'factory started');
    /**
     * Creates a new WMS layer for displaying on the map.
     * @class
     *
     * @callback onLoad
     *
     * @param {Object} options - Properties for configuring the new WMS layer.
     * @param {string} options.name - A title for the new layer.
     * @param {Object} [options.requestParams] - An object of parameters to append to the WMS request.
     * @param {boolean} [options.queryable=false] - Whether or not the layer should allow click queries.
     * @param {number} [options.opacity=1] - The initial opacity to set the layer to. Should be between 0 and 1.
     * @param {number} [options.zIndexHint=0] - A hint for where in the layer stack to place the new layer.
     * @param {string} [options.wmsUrl] - The url to use when loading the WMS layer.
     * @param {boolean} [options.isTiled=false] - If true, load the layer in tiles using GeoWebCache. Otherwise loads as a single image.
     * @param {onLoad} [options.onLoad] - Called on each WMS image load start.
     */
    var WmsLayer = function (options) {
        var _self = this;
        var _isLoading = false;
        var _requestParams = options.requestParams || {};
        var _olSource;
        var _olLayer;
        var _loadStart = function () {
            _self.styleDirectiveScope.$evalAsync(function () {
                _isLoading = true;
                _self.styleDirectiveScope.$emit(_self.id + ':isLoading');
                if (_.isFunction(options.onLoad)) {
                    options.onLoad.call(this);
                }
            });
        };
        var _loadEnd = function () {
            _self.styleDirectiveScope.$evalAsync(function () {
                _isLoading = false;
                _self.styleDirectiveScope.$emit(_self.id + ':finishedLoading');
            });
        };

        if (_.isUndefined(_requestParams.VERSION)) {
            _requestParams.VERSION = '1.1.1';
        }

        if (options.isTiled) {
            var loadingTileCount = 0;
            _olSource = new ol.source.TileWMS({
                url: options.wmsUrl || (CONFIG.geoserver.defaultUrl + '/gwc/service/wms'),
                params: _requestParams
            });

            _olSource.on('tileloadstart', function () {
                loadingTileCount += 1;
                _loadStart();
            });

            _olSource.on(['tileloadend', 'tileloaderror'], function () {
                loadingTileCount -= 1;
                if (loadingTileCount <= 0) {
                    loadingTileCount = 0; //zero count, just in case
                    _loadEnd();
                }
            });

            _olLayer = new ol.layer.Tile({
                source: _olSource
            });
        } else {
            _olSource = new ol.source.ImageWMS({
                url: options.wmsUrl || (CONFIG.geoserver.defaultUrl + '/wms'),
                params: _requestParams
            });

            _olSource.on('imageloadstart', function () {
                _loadStart();
            });

            _olSource.on(['imageloadend', 'imageloaderror'], function () {
                _loadEnd();
            });

            _olLayer = new ol.layer.Image({
                source: _olSource
            });
        }

        if (_.isNumber(options.opacity)) {
            _olLayer.setOpacity(Math.min(Math.max(options.opacity, 0), 1));
        }

        $log.debug(tag + 'new WmsLayer(' + arguments[0] + ')');
        MapLayer.apply(this, [options.name, _olLayer, options.queryable, options.zIndexHint]);

        this.updateRequestParams = function (params) {
            params.unique = _.now();
            _olSource.updateParams(params);
        };

        this.applyCql = function (cql) {
            this.updateRequestParams({
                CQL_FILTER: (_.isEmpty(cql) || _.isEmpty(cql.trim())) ? null : cql
            });
        };

        this.isLoading = function () {
            return _isLoading;
        };

        this.searchPoint = function (coord, res, requestOverrides) {
            var baseResponse = this.getEmptySearchPointResult();
            var url = this.getOl3Layer().getSource().getGetFeatureInfoUrl(
                coord, res, CONFIG.map.projection, _.merge({
                    INFO_FORMAT: 'application/json',
                    FEATURE_COUNT: 999999
                }, requestOverrides)
            );
            return $http.get($filter('cors')(url, null, CONFIG.geoserver.omitProxy))
                .then(function (response) {
                    return _.merge(baseResponse, {
                        records: _.pluck(response.data.features, 'properties'),
                        layerFill: {
                            display: 'none'
                        }
                    });
                }, function (response) {
                    return _.merge(baseResponse, {
                        isError: true,
                        reason: 'Server error'
                    });
                });
        };
    };
    WmsLayer.prototype = Object.create(MapLayer.prototype);

    return WmsLayer;
}])

;
