angular.module('stealth.core.geo.ol3.layers')

.factory('stealth.core.geo.ol3.layers.ViewerLayer', [
'$log',
'stealth.core.geo.ol3.layers.MapLayer',
'CONFIG',
function ($log, MapLayer, CONFIG) {
    var tag = 'stealth.core.geo.ol3.layers.ViewerLayer: ';
    $log.debug(tag + 'factory started');

    var ViewerLayer = function (name) {
        var _w = 0;
        var _h = 0;
        var _canvas = document.createElement('canvas');
        var _ctx = _canvas.getContext('2d');

        var _drawFn  = function (extent, resolution, pixelRatio, size, projection) {
            _canvas.setAttribute('width', _w);
            _canvas.setAttribute('height', _h);
            _ctx.clearRect(0, 0, _w, _h);

            // TODO: Implement the drawing logic.

            return _canvas;
        };

        var _olSource = new ol.source.ImageCanvas({
            canvasFunction: _drawFn,
            projection: CONFIG.map.projection
        });

        var _olLayer = new ol.layer.Image({
            source: _olSource
        });


        this.setCanvasSize = function (width, height) {
            _w = width;
            _h = height;
        };

        $log.debug(tag + 'new ViewerLayer(' + name + ')');
        MapLayer.apply(this, [name, _olLayer]);
        // TODO: Set viewer layer style directive.
        // TODO: Define viewer layer style directive below.
        // TODO: this.styleDirective = 'st-viewer-layer-style';
    };
    ViewerLayer.prototype = Object.create(MapLayer.prototype);
    return ViewerLayer;
}])

.directive('stViewerLayerStyle', [
'$log',
function ($log) {
    $log.debug('stealth.core.geo.ol3.layers.stViewerLayerStyle: directive defined');
    return {
        // TODO: Define style for viewer layer.
        template: '<div></div>'
    };
}])


;
