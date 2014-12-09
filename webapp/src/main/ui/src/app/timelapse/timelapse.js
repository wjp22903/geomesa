angular.module('stealth.timelapse', [
    'stealth.core.geo.ol3.map',
    'stealth.timelapse.geo.ol3.layers',
    'stealth.timelapse.wizard'
])

.run([
'$log',
'ol3Map',
'stealth.timelapse.geo.ol3.layers.LiveLayer',
'stealth.timelapse.geo.ol3.layers.HistoricalLayer',
function ($log, map, LiveLayer, HistoricalLayer) {
    // TODO: Remove this code that adds a layer to the map.
    // TODO: Replace with code to register the tracking category with the Map Manager.
    var live = new LiveLayer('Test Live Layer');
    map.addLayer(live);
    var historical = new HistoricalLayer('Test Historical Layer');
    map.addLayer(historical);
    $log.debug('stealth.timelapse: plugin loaded');
}])

;
