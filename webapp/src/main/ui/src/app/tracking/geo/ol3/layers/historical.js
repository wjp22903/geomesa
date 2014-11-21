angular.module('stealth.tracking.geo.ol3.layers')

.factory('stealth.tracking.geo.ol3.layers.HistoricalLayer', [
'$log',
'stealth.core.geo.ol3.layers.ViewerLayer',
function ($log, ViewerLayer) {
    var tag = 'stealth.tracking.geo.ol3.layers.HistoricalLayer: ';
    $log.debug(tag + 'factory started');

    var HistoricalLayer = function (name) {
        $log.debug(tag + 'new HistoricalLayer(' + name + ')');
        ViewerLayer.apply(this, arguments);
    };
    HistoricalLayer.prototype = Object.create(ViewerLayer.prototype);
    return HistoricalLayer;
}])

.directive('stHistoricalLayerStyle', [
'$log',
function ($log) {
    $log.debug('stealth.tracking.geo.ol3.layers.stHistoricalLayerStyle: directive defined');
    return {
        // TODO: Define style for historical layer.
        template: '<div></div>'
    };
}])

;