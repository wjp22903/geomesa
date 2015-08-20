angular.module('stealth.core.geo.ol3.layers')

.factory('stealth.core.geo.ol3.layers.TintLayer', [
'$log',
'stealth.core.geo.ol3.layers.MapLayer',
function ($log, MapLayer) {
    var tag = 'stealth.core.geo.ol3.layers.TintLayer: ';
    $log.debug(tag + 'factory started');
    var TintLayer = function (darkness) {
        $log.debug(tag + 'new TintLayer(' + arguments[0] + ')');

        var polygon = new ol.geom.Polygon([[[-180, 90], [180, 90], [180, -90], [-180, -90], [-180, 90]]]);
        var _olSource = new ol.source.Vector({
            features: [new ol.Feature({
                geometry: polygon
            })],
            wrapX: false
        });
        var _olLayer = new ol.layer.Vector({
            source: _olSource,
            opacity: 0,
            style: new ol.style.Style({
                fill: new ol.style.Fill({color: '#000'})
            })
        });
        MapLayer.apply(this, ['Tint', _olLayer, false, -8]);
        var _self = this;

        var _darkness = darkness;
        this.getDarkness = function () { return _darkness; };
        this.setDarkness = function (darkness) {
            _darkness = Math.min(Math.max(darkness, -1), 1);
            _olLayer.setOpacity(Math.abs(_darkness));
            var style = _olLayer.getStyle();
            style.getFill().setColor(_darkness < 0 ? '#fff' : '#000');
            _olLayer.setStyle(style);
        };
        this.setDarkness(darkness);
        this.styleDirective = 'st-tint-layer-style';
        this.styleDirectiveScope.styleVars.iconClass = 'fa fa-fw fa-lg fa-adjust';
        this.styleDirectiveScope.layerState.darkness = _darkness;
        this.styleDirectiveScope.$watch('layerState.darkness', function (newVal) {
            _self.setDarkness(newVal);
        });
    };
    TintLayer.prototype = Object.create(MapLayer.prototype);

    return TintLayer;
}])

.directive('stTintLayerStyle', [
'$log',
function ($log) {
    $log.debug('stealth.core.geo.ol3.layers.stTintLayerStyle: directive defined');
    return {
        templateUrl: 'core/geo/ol3/layers/tint.tpl.html'
    };
}])
;
