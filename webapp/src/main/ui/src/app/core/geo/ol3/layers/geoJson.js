angular.module('stealth.core.geo.ol3.layers')

.factory('stealth.core.geo.ol3.layers.GeoJsonLayer', [
'$log',
'stealth.core.geo.ol3.layers.MapLayer',
function ($log, MapLayer) {
    var tag = 'stealth.core.geo.ol3.layers.GeoJsonLayer: ';
    $log.debug(tag + 'factory started');
    var GeoJsonLayer = function (name, ol3Layer) {
        $log.debug(tag + 'new GeoJsonLayer(' + arguments[0] + ')');
        MapLayer.apply(this, arguments);
        this.styleDirective = 'st-geo-json-layer-style';
    };
    GeoJsonLayer.prototype = Object.create(MapLayer.prototype);
    return GeoJsonLayer;
}])

.directive('stGeoJsonLayerStyle', [
'$log',
function ($log) {
    $log.debug('stealth.core.geo.ol3.layers.stGeoJsonLayerStyle: directive defined');
    return {
        template: '<ui-include src="fragmentUrl" fragment="\'.layerStyleGeoJsonLayer\'"></ui-include>'
    };
}])

;
