angular.module('test.ui.timelapse.controls.controls.test', [
    'templates-app',
    'stealth.core.utils', // Need this here (in the test) since stealth.core.utils
                          // is assumed to be loaded for all modules (in the app).
    'stealth.core.geo.ol3.map',
    'stealth.timelapse.stores',
    'stealth.timelapse.geo.ol3.layers',
    'stealth.timelapse.controls'
])

.config([
'$provide',
'$logProvider',
function ($provide, $logProvider) {
    var config = angular.copy(STEALTH.config);
    config.assets = {};
    config.assets.path = '../../../../../target/stealth/assets/';
    config.map.initExtent = [-87, 30, -75, 36];
    $provide.constant('CONFIG', config);

    $logProvider.debugEnabled(true);
}])

.service('drawingService', [
'$log',
'$rootScope',
'ol3Map',
'stealth.timelapse.geo.ol3.layers.TimeLapseLayer',
'stealth.timelapse.stores.BinStore',
function ($log, $rootScope, ol3Map, TimeLapseLayer, BinStore) {
    var tag = 'test.ui.timelapse.controls.controls.test.drawingService: ';
    $log.debug(tag + 'service started')

    $log.debug(tag + 'adding TimeLapse layer')
    var layer = new TimeLapseLayer('Test TimeLapse Layer');
    ol3Map.addLayer(layer);

    var timeMillis = 0;
    var windowMillis = 0;
    $rootScope.$on('timelapse:dtgChanged', function (event, millis) {
        timeMillis = millis;

        layer.redraw(timeMillis, windowMillis);
    });

    $rootScope.$on('timelapse:windowChanged', function (event, millis) {
        windowMillis = millis;

        layer.redraw(timeMillis, windowMillis);
    });

    var stores = {};
    this.createBinStore = function (storeName, arrayBuffer) {
        var store = new BinStore(storeName, null, 3, null, arrayBuffer);
        layer.addStore(store);
        stores[storeName] = store;
    };

    this.removeBinStore = function (storeName) {
        layer.removeStore(stores[storeName]);
        stores[storeName] = null;
    };
}])

.service('fileReader', [
'$log',
'drawingService',
function ($log, drawingService) {
    var tag = 'test.ui.timelapse.controls.controls.test.fileReader: ';
    $log.debug(tag + 'service started')
    var r = new FileReader();

    var fileName = '';

    // On-load listener function.
    r.onload = function (e) {
        $log.debug(tag + '"' + fileName + '" file loaded')
        var buffer = r.result;
        drawingService.createBinStore(fileName, buffer);
    };

    this.loadFile = function (file) {
        fileName = file.name;
        r.readAsArrayBuffer(file);
    };
}])

.controller('testController', [
'$log',
'$scope',
'fileReader',
'drawingService',
function ($log, $scope, r, drawingService) {
    var tag = 'test.ui.timelapse.controls.controls.test.controller: ';
    $log.debug(tag + 'controller started');

    $scope.filesList = [];

    $scope.fileSelected = function (el) {
        var file = el.files[0];
        $scope.filesList.push(file.name);
        $scope.$apply();
        r.loadFile(file);
    };

    $scope.removeFromList = function (file) {
        _.pull($scope.filesList, file);
        drawingService.removeBinStore(file);
    };
}])

.directive('stTestBinFilesList', [
function () {
    return {
        restrict: 'E',
        template: '<div ng-controller="testController"> \
                       <input id="upfile" \
                              type="file" \
                              value="upload" \
                              onchange="angular.element(this).scope().fileSelected(this)"> \
                       <h5><u>Files List</u></h5> \
                       <div ng-repeat="file in filesList"> \
                           <span> \
                               {{file}} \
                               <button type="button" ng-click="removeFromList(file)">X</button> \
                           </span> \
                       </div> \
                   </div>'
    };
}])

;
