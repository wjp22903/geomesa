angular.module('stealth.timelapse', [
    'stealth.core.geo.ol3.map',
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
'$compile',
'$templateCache',
'ol3Map',
'tlControlsManager',
'stealth.timelapse.geo.ol3.layers.LiveLayer',
'stealth.timelapse.geo.ol3.layers.HistoricalLayer',
'elementAppender',
function ($log, $rootScope, $compile, $templateCache,
          ol3Map, controlsMgr, LiveLayer, HistoricalLayer, elementAppender) {
    $log.debug('stealth.timelapse.tlLayerManager: service started');
    var live, historical;
    function registerLayers () {
        live = new LiveLayer('Live');
        ol3Map.addLayer(live);
        historical = new HistoricalLayer('Historical');
        ol3Map.addLayer(historical);
    }

    var timeMillis = null;
    var windowMillis = null;
    function registerControlsListeners() {
        controlsMgr.registerDtgListener(function (millis) {
            timeMillis = millis;

            live.redraw(timeMillis, windowMillis);
            historical.redraw(timeMillis, windowMillis);
        });

        controlsMgr.registerWindowListener(function (millis) {
            windowMillis = millis;

            live.redraw(timeMillis, windowMillis);
            historical.redraw(timeMillis, windowMillis);
        });
    }

    this.start = function () {
        registerLayers();
        elementAppender.append('.primaryDisplay', 'timelapse/controls/controlsPanel.tpl.html', $rootScope.$new());
        registerControlsListeners();
    };

    this.getHistoricalLayer = function () {
        return historical;
    };
}])
;
