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
    var live, historical;
    function registerLayers () {
        historical = new TimeLapseLayer('Historical');
        ol3Map.addLayer(historical);
    }

    var timeMillis = null;
    var windowMillis = null;
    function registerControlsListeners() {
        controlsMgr.registerDtgListener(function (millis) {
            timeMillis = millis;
            historical.redraw(timeMillis, windowMillis);
        });

        controlsMgr.registerWindowListener(function (millis) {
            windowMillis = millis;
            historical.redraw(timeMillis, windowMillis);
        });
    }

    this.start = function () {
        registerLayers();
        registerControlsListeners();
        elementAppender.append('.primaryDisplay', 'timelapse/controls/controlsPanel.tpl.html', $rootScope.$new());
    };

    this.getHistoricalLayer = function () {
        return historical;
    };
}])
;
