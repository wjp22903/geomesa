angular.module('test.ui.timelapse.geo.ol3.layers.timelapse.test', [
    'templates-app',
    'stealth.core.utils', // Need this here (in the test) since stealth.core.utils
                          // is assumed to be loaded for all modules (in the app).
    'stealth.core.geo.ol3.map',
    'stealth.timelapse.stores',
    'stealth.timelapse.geo.ol3.layers'
])

.config([
'$provide',
'$logProvider',
function ($provide, $logProvider) {
    var config = angular.copy(STEALTH.config);
    config.assets = {};
    config.assets.path = '../../../../../../../target/stealth/assets/';
    config.map.initExtent = [-87, 30, -75, 36];
    $provide.constant('CONFIG', config);

    $logProvider.debugEnabled(true);
}
])

.service('drawingService', [
'$log',
'$interval',
'ol3Map',
'stealth.timelapse.geo.ol3.layers.TimeLapseLayer',
'stealth.timelapse.stores.BinStore',
function ($log, $interval, ol3Map, TimeLapseLayer, BinStore) {
    var tag = 'test.ui.timelapse.geo.ol3.layers.timelapse.test.drawingService: ';
    $log.debug(tag + 'service started')

    $log.debug(tag + 'adding TimeLapse layer')
    var layer = new TimeLapseLayer('Test TimeLapse Layer');
    ol3Map.addLayer(layer);

    var minTimeMillis = 0;
    var maxTimeMillis = 0;
    var curTimeMillis = 0;
    var windowMillis = 10 * 60 * 1000;
    var stepMillis = 10 * 1000;
    var store = null;
    var loop = null;
    this.setArrayBuffer = function (arrayBuffer) {
        if (loop !== null) {
            $interval.cancel(loop);
            loop = null;
        }
        if (store !== null) {
            layer.removeStore(store);
        }
        store = new BinStore(arrayBuffer);
        curTimeMillis = minTimeMillis = store.getMinTimeInMillis();
        maxTimeMillis = store.getMaxTimeInMillis();
        layer.addStore(store);
        startLoop();
    };

    function startLoop () {
        $log.debug(tag + 'started loop');
        loop = $interval(
            function () {
                redraw();
            },
            20 /*redraw interval in millis*/
        );
    };

    function redraw() {
        layer.redraw(curTimeMillis, windowMillis);
        var t = curTimeMillis + stepMillis;
        if (t > maxTimeMillis) {
            curTimeMillis = minTimeMillis;
        } else {
            curTimeMillis = t;
        }
    }
}])

.service('fileReader', [
'$log',
'drawingService',
function ($log, drawingService) {
    var tag = 'test.ui.timelapse.geo.ol3.layers.timelapse.test.fileReader: ';
    $log.debug(tag + 'service started')
    var r = new FileReader();

    var fileName = '';

    // On-load listener function.
    r.onload = function (e) {
        $log.debug(tag + '"' + fileName + '" file loaded')
        var buffer = r.result;
        drawingService.setArrayBuffer(buffer);
    };

    this.loadFile = function (file) {
        fileName = file.name;
        r.readAsArrayBuffer(file);
    };
}])

.controller('controller', [
'$log',
'$scope',
'fileReader',
function ($log, $scope, r) {
    var tag = 'test.ui.timelapse.geo.ol3.layers.timelapse.test.controller: ';
    $log.debug(tag + 'controller started');

    $scope.fileSelected = function (el) {
        var file = el.files[0];
        r.loadFile(file);
    };
}])

;
