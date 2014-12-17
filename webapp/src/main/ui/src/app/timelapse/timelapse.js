angular.module('stealth.timelapse', [
    'stealth.core.geo.ol3.map',
    'stealth.timelapse.geo.ol3.layers',
    'stealth.timelapse.controls',
    'stealth.timelapse.wizard'
])

.run([
'$log',
'bootstrap',
function ($log, bootstrap) {
    bootstrap.start();
    $log.debug('stealth.timelapse: plugin loaded');

}])

.service('bootstrap', [
'$log',
'$rootScope',
'$compile',
'$templateCache',
'ol3Map',
'stealth.timelapse.geo.ol3.layers.LiveLayer',
'stealth.timelapse.geo.ol3.layers.HistoricalLayer',
function ($log, $rootScope, $compile, $templateCache,
          ol3Map, LiveLayer, HistoricalLayer) {
    $log.debug('stealth.timelapse.bootstrap: service started');

    // TODO: Add code to register the tracking category with the Map Manager.

    var live, historical;
    function registerLayers () {
        live = new LiveLayer('Test Live Layer');
        ol3Map.addLayer(live);
        historical = new HistoricalLayer('Test Historical Layer');
        ol3Map.addLayer(historical);
    }

    function addControlsPanel () {
        var primaryDisplay = angular.element('.primaryDisplay');
        var controlsPanel = angular.element($templateCache.get('timelapse/controls/controlsPanel.tpl.html'));
        var scope = $rootScope.$new();
        var newEl = {};
        var compiled = null;
        // This is a work-around for
        // https://github.com/angular/angular.js/issues/4203
        // taken from
        // https://gist.github.com/sjbarker/11048078
        var dereg = scope.$watch(newEl, function () {
            compiled = $compile(newEl)(scope);
            primaryDisplay.append(compiled);
            dereg();
        });
        newEl = angular.element(controlsPanel);

    }

    var timeMillis = null;
    var windowMillis = null;
    function registerControlsListeners() {
        $rootScope.$on('timelapse:dtgChanged', function (event, millis) {
            timeMillis = millis;

            live.redraw(timeMillis, windowMillis);
            historical.redraw(timeMillis, windowMillis);
        });

        $rootScope.$on('timelapse:windowChanged', function (event, millis) {
            windowMillis = millis;

            live.redraw(timeMillis, windowMillis);
            historical.redraw(timeMillis, windowMillis);
        });
    }

    function start () {
        registerLayers();
        addControlsPanel();
        registerControlsListeners();
    }

    return {
        start: start
    };
}])

;
