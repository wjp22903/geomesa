angular.module('stealth.tracking.geo.ol3.layers')

.factory('stealth.tracking.geo.ol3.layers.LiveLayer', [
'$log',
'stealth.core.geo.ol3.layers.ViewerLayer',
function ($log, ViewerLayer) {
    var tag = 'stealth.tracking.geo.ol3.layers.LiveLayer: ';
    $log.debug(tag + 'factory started');

    var LiveLayer = function (name) {
        $log.debug(tag + 'new LiveLayer(' + name + ')');
        ViewerLayer.apply(this, arguments);
    };
    LiveLayer.prototype = Object.create(ViewerLayer.prototype);
    return LiveLayer;
}])

.directive('stLiveLayerStyle', [
'$log',
function ($log) {
    $log.debug('stealth.tracking.geo.ol3.layers.stLiveLayerStyle: directive defined');
    return {
        // TODO: Define style for live layer.
        template: '<div></div>'
    };
}])

;