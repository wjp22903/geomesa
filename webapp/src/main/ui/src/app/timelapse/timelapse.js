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
'mapClickSearchService',
'ol3Map',
'tlControlsManager',
'summaryExploreMgr',
'stealth.timelapse.geo.ol3.layers.HistoricalLayer',
'elementAppender',
'CONFIG',
function ($log, $rootScope, mapClickSearchService, ol3Map, controlsMgr,
          summaryExploreMgr, HistoricalLayer, elementAppender, CONFIG) {
    $log.debug('stealth.timelapse.tlLayerManager: service started');
    var live, historical;
    function registerLayers () {
        historical = new HistoricalLayer('Historical');
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
        elementAppender.append('.primaryDisplay', 'timelapse/controls/controlsPanel.tpl.html', $rootScope.$new());
        registerControlsListeners();
        mapClickSearchService.registerSearchable(function (coord, res) {
            return historical.searchActiveStores(coord, res);
        });
        mapClickSearchService.registerSearchable(function (coord, res) {
            return summaryExploreMgr.searchActiveSummaryLayers(coord, res);
        });
    };

    this.getHistoricalLayer = function () {
        return historical;
    };
}])
;
