angular.module('stealth.timelapse', [
    'stealth.core.geo.ol3.map',
    'stealth.core.interaction',
    'stealth.timelapse.geo',
    'stealth.timelapse.controls',
    'stealth.timelapse.wizard'
])

.run([
'$log',
'tlLayerManager',
function ($log, tlLayerManager) {
    tlLayerManager.start();
    $log.debug('stealth.timelapse: plugin loaded');
}])

.service('tlLayerManager', [
'$log',
'$rootScope',
'ol3Map',
'tlControlsManager',
'stealth.timelapse.geo.ol3.layers.TimeLapseLayer',
'elementAppender',
function ($log, $rootScope, ol3Map, controlsMgr, TimeLapseLayer, elementAppender) {
    $log.debug('stealth.timelapse.tlLayerManager: service started');
    var historical;
    function registerLayers () {
        historical = new TimeLapseLayer('Historical');
        ol3Map.addLayer(historical);
    }

    function registerControlsListener() {
        controlsMgr.registerListener(function (startMillis, endMillis, windowMillis) {
            historical.redraw(startMillis, endMillis, windowMillis);
        });
    }

    this.start = function () {
        registerLayers();
        registerControlsListener();
        elementAppender.append('.primaryDisplay', 'timelapse/controls/controlsPanel.tpl.html', $rootScope.$new());
    };

    this.getHistoricalLayer = function () {
        return historical;
    };
}])
;
