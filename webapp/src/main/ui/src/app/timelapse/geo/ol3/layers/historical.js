angular.module('stealth.timelapse.geo.ol3.layers')

.factory('stealth.timelapse.geo.ol3.layers.HistoricalLayer', [
'$log',
'stealth.timelapse.geo.ol3.layers.TimeLapseLayer',
function ($log, TimeLapseLayer) {
    var tag = 'stealth.timelapse.geo.ol3.layers.HistoricalLayer: ';
    $log.debug(tag + 'factory started');

    var HistoricalLayer = function (name) {
        $log.debug(tag + 'new HistoricalLayer(' + name + ')');
        TimeLapseLayer.apply(this, arguments);
    };
    HistoricalLayer.prototype = Object.create(TimeLapseLayer.prototype);
    return HistoricalLayer;
}])

;