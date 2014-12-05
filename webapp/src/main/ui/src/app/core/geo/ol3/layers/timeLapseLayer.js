angular.module('stealth.core.geo.ol3.layers')

.factory('stealth.core.geo.ol3.layers.TimeLapseLayer', [
'$log',
'stealth.core.geo.ol3.layers.MapLayer',
'CONFIG',
function ($log, MapLayer, CONFIG) {
    var tag = 'stealth.core.geo.ol3.layers.TimeLapseLayer: ';
    $log.debug(tag + 'factory started');

    var TimeLapseLayer = function (name) {
        var _w = 0;
        var _h = 0;
        var _canvas = document.createElement('canvas');
        var _ctx = _canvas.getContext('2d');

        var _drawFn  = function (extent, resolution, pixelRatio, size, projection) {
            _w = size[0];
            _h = size[1];
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

        $log.debug(tag + 'new TimeLapseLayer(' + name + ')');
        MapLayer.apply(this, [name, _olLayer]);
        // TODO: Set viewer layer style directive.
        // TODO: Define viewer layer style directive below.
        // TODO: this.styleDirective = 'st-viewer-layer-style';
    };
    TimeLapseLayer.prototype = Object.create(MapLayer.prototype);
    return TimeLapseLayer;
}])

.directive('stTimeLapseLayerStyle', [
'$log',
function ($log) {
    $log.debug('stealth.core.geo.ol3.layers.stTimeLapseLayerStyle: directive defined');
    return {
        // TODO: Define style for viewer layer.
        template: '<div></div>'
    };
}])


;
