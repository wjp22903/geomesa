angular.module('stealth.core.geo.ol3.layers', [
    'stealth.core.utils'
])

.factory('stealth.core.geo.ol3.layers.XYZLayer', [
'$log',
'stealth.core.geo.ol3.layers.MapLayer',
'CONFIG',
function ($log, MapLayer, CONFIG) {
    var tag = 'stealth.core.geo.ol3.layers.XYZLayer: ';
    $log.debug(tag + 'factory started');
    /**
     * Creates a new XYZ layer for displaying on the map.
     * @class
     *
     * @callback onLoad
     *
     * @param {Object}  options - Properties for configuring the new XYZLayer layer.
     * @param {string}  options.name - A title for the new layer.
     * @param {string}  options.serverUrl - The url to use when loading the XYZ layer.
     * @param {string}  options.originalProjection - The projection the XYZ Layer is in.
     * @param {number}  [options.opacity=1] - The initial opacity to set the layer to. Should be between 0 and 1.
     * @param {number}  [options.zIndexHint=0] - A hint for where in the layer stack to place the new layer.
     * @param {number}  [options.tileSize] - The size of the XYZ tiles. Defaults to 256.
     * @param {boolean} [options.wrapX] - Boolean for whether to wrap X. Defaults to true.
     * @param {number}  [options.minZoom] - Minimum zoom level. Defaults to 10
     * @param {number}  [options.maxZoom] - Maximum zoom level. Defaults to 20
     */
    var XYZLayer = function (options) {
        var _options = options || {};
        var _self = this;
        var _isLoading = false;
        var serverUrl = _options.serverUrl || (CONFIG.geoserver.defaultUrl + '/{z}/{x}/{y}.png');
        var _olSource;
        var _olLayer;
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

        _olSource = new ol.source.XYZ({
            projection: ol.proj.get(_options.originalProjection),
            tileSize: _options.tileSize || 256,
            wrapX: _.isBoolean(_options.wrapX) ? _options.wrapX : true,
            minZoom: _options.minZoom || 10,
            maxZoom: _options.maxZoom || 20,
            url: serverUrl
        });

        _olSource.on('imageloadstart', function () {
            _loadStart();
        });

        _olSource.on(['imageloadend', 'imageloaderror'], function () {
            _loadEnd();
        });

        _olLayer = new ol.layer.Tile({
            source: _olSource
        });

        if (_.isNumber(_options.opacity)) {
            _olLayer.setOpacity(Math.min(Math.max(_options.opacity, 0), 1));
        }

        MapLayer.apply(this, [_options.name, _olLayer, _options.queryable, _options.zIndexHint]);

        this.isLoading = function () {
            return _isLoading;
        };
    };
    XYZLayer.prototype = Object.create(MapLayer.prototype);

    return XYZLayer;
}])

;
