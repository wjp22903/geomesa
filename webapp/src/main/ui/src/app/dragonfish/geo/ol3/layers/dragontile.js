/**
 Dragontiles expects an additional configuration parameter that is grabbed
 from the global CONFIG which is not present in the default reference.conf
 Config.dragonfish.tiles = {
    servletPathTemplate: '{{geoserverPath}}/dragonfish/map/'
 }
 The servletPathTemplate is taken as a template intended to be used with
 angular's $interpolate. The example above will use the geoserver path global
 to stealth. Make sure the template ends with a slash.
 After that is set, the code below will attempt to append the following to the
 end of the url:
    {imageId}/{z}/{x}/{y}

*/
angular.module('stealth.dragonfish.geo.ol3.layers')

.constant('stealth.dragonfish.geo.ol3.layers.DragonTileConstant', {
    title: 'Dragonfish Imagery',
    icon: 'fa-camera',
    defaultServletPathTemplate: '{{geoserverPath}}/dragonfish/map/',
    projection: ol.proj.get('EPSG:4326'),
    queryable: false,
    zIndexHint: -15,
    toggledOn: true,
    tileSize: 256,
    wrapX: true,
    maxZoom: 20,
    minZoom: 10
})

.factory('stealth.dragonfish.geo.ol3.layers.DragonTileLayer', [
'$log',
'CONFIG',
'$rootScope',
'$interpolate',
'stealth.core.geo.ol3.layers.MapLayer',
'stealth.dragonfish.geo.ol3.layers.EntityConstant',
'stealth.dragonfish.geo.ol3.layers.DragonTileConstant',
function ($log, CONFIG, $rootScope, $interpolate, MapLayer, EL, DTC) {
    var tag = 'stealth.dragonfish.geo.ol3.layers.DragonTileLayer: ';
    $log.debug(tag + 'factory started');

    var DragonTileLayer = function (options) {
        var _options = options || {};
        var _self = this;
        var _queryable = _options.queryable || DTC.queryable;
        var _zIndexHint = _options.zIndexHint || DTC.zIndexHint;
        var _imageId  = _options.imageId;
        var _categoryid = _options.categoryId;
        var _viewState = {
            toggledOn: _options.toggledOn || DTC.toggledOn
        };
        // options particular to xyz tile code
        var _tileSize = _options.tileSize || DTC.tileSize;
        var _maxZoom = _options.maxZoom || DTC.maxZoom;
        var _minZoom = _options.minZoom || DTC.minZoom;
        var _wrapX = _options.wrapX || DTC.wrapX;

        // construct templateUrl
        var templateUrl = _.get(CONFIG, 'dragonfish.tiles.servletPathTemplate', DTC.defaultServletPathTemplate);
        if (!_.endsWith(templateUrl, '/')) {
            templateUrl += '/';
        }
        var tileURL = $interpolate(templateUrl)({geoserverPath: CONFIG.geoserver.defaultUrl}) + _imageId + '/';
        var _dragonTileSource = new ol.source.XYZ({
            projection: DTC.projection,
            tileSize: _tileSize,
            wrapX: _wrapX,
            minZoom: _minZoom,
            maxZoom: _maxZoom,
            tileUrlFunction: function (tileCoord) {
                var z = (tileCoord[0] - 1).toString();
                var x = tileCoord[1].toString();
                var y = (-tileCoord[2] - 1).toString();
                return tileURL + z + '/' + x + '/' + y;
            }
        });

        var _ol3Layer = new ol.layer.Tile({
            source: _dragonTileSource
        });

        $log.debug(tag + 'new DragonTiles Layer(' + arguments[0] +')');
        MapLayer.apply(_self, [_imageId, _ol3Layer, _queryable, _zIndexHint]);
        _self.styleDirective = 'st-dragon-tile-layer-style-view';
        _self.styleDirectiveScope.styleVars.iconClass = 'fa fa-fw fa-lg ' + DTC.icon;
        _.set(_self, 'viewState', _viewState);
        _self.styleDirectiveScope.getViewState = function () {
            return _self.viewState;
        };
        _self.styleDirectiveScope.removeLayer = function () {
            $rootScope.$emit(EL.removeEvent, {layerId: _self.id, categoryId: _categoryid});
        };
        _self.getImageId = function () {
            return _imageId;
        };
    };
    DragonTileLayer.prototype = Object.create(MapLayer.prototype);

    return DragonTileLayer;
}])

.directive('stDragonTileLayerStyleView', [
'$log',
function ($log) {
    var tag = 'stealth.dragonfish.geo.ol3.layers.stDragonTileLayerStyleView: ';
    $log.debug(tag + 'directive defined');
    return {
        templateUrl: 'dragonfish/geo/ol3/layers/dragontile-layerstyleview.tpl.html'
    };
}])
;
