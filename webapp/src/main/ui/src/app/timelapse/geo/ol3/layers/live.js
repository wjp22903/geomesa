angular.module('stealth.timelapse.geo.ol3.layers')

.factory('stealth.timelapse.geo.ol3.layers.LiveLayer', [
'$log',
'stealth.timelapse.geo.ol3.layers.TimeLapseLayer',
function ($log, TimeLapseLayer) {
    var tag = 'stealth.timelapse.geo.ol3.layers.LiveLayer: ';
    $log.debug(tag + 'factory started');

    var LiveLayer = function (name) {
        $log.debug(tag + 'new LiveLayer(' + name + ')');
        TimeLapseLayer.apply(this, arguments);
    };
    LiveLayer.prototype = Object.create(TimeLapseLayer.prototype);
    return LiveLayer;
}])

.directive('stLiveLayerStyle', [
'$log',
function ($log) {
    $log.debug('stealth.timelapse.geo.ol3.layers.stLiveLayerStyle: directive defined');
    return {
        // TODO: Define style for live layer.
        template: '<div></div>'
    };
}])

;