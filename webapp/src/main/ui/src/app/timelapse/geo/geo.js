angular.module('stealth.timelapse.geo', [
    'colorpicker.module',
    'frapontillo.bootstrap-switch',
    'stealth.timelapse.geo.ol3.layers',
    'stealth.timelapse.stores',
    'stealth.timelapse.wizard'
])

.run([
'categoryManager',
'stealth.core.geo.ol3.manager.Category',
'stealth.core.utils.WidgetDef',
function (catMgr, Category, WidgetDef) {
    catMgr.addCategory(1, new Category(0, 'Time-enabled', 'fa-clock-o',
        new WidgetDef('st-timelapse-geo-category'), null, true));
}])

.directive('stTimelapseGeoCategory', [
'$log',
'wms',
'ol3Map',
'stealth.core.geo.ol3.layers.MapLayer',
'tlLayerManager',
'stealth.timelapse.stores.BinStore',
'colors',
'tlWizard',
'CONFIG',
function ($log, wms, ol3Map, MapLayer, tlLayerManager, BinStore, colors, tlWizard, CONFIG) {
    $log.debug('stealth.core.geo.context.stTimelapseGeoCategory: directive defined');
    return {
        templateUrl: 'timelapse/geo/category.tpl.html',
        controller: ['$scope', function ($scope) {
            var currentFileName = 'unknown';
            var fileReader = new FileReader();
            fileReader.onload = function (e) {
                $scope.$apply(function () {
                    tlLayerManager.getHistoricalLayer().addStore(
                        new BinStore(fileReader.result, currentFileName));
                });
            };

            $scope.historicalLayer = tlLayerManager.getHistoricalLayer();

            $scope.timelapse = {
                mode: 'historical',
                summaryOn: true
            };
            if (_.isUndefined($scope.workspaces)) {
                $scope.workspaces = {
                    live: [],
                    historical: [],
                    summary: []
                };
                wms.getCapabilities('cors/' + CONFIG.geoserver.defaultUrl + '/wms')
                    .then(function (wmsCap) {
                        _.each(wmsCap.Capability.Layer.Layer, function (l) {
                            var nameParts = l.Name.split(':');
                            if (nameParts.length === 2) {
                                var name = nameParts[1];
                                var wsParts = nameParts[0].split('.');
                                if (wsParts.length > 3 && wsParts[0] === CONFIG.app.context &&
                                        wsParts[1] === 'timelapse') {
                                    var layer = _.cloneDeep(l);
                                    layer.categoryViewState = {
                                        toggledOn: false
                                    };
                                    var workspace = wsParts[3];
                                    if (_.contains(['live', 'historical', 'summary'], wsParts[2])) {
                                        if (_.isArray($scope.workspaces[wsParts[2]][workspace])) {
                                            $scope.workspaces[wsParts[2]][workspace].push(layer);
                                        } else {
                                            $scope.workspaces[wsParts[2]][workspace] = [layer];
                                        }
                                    }
                                }
                            }
                        });
                    });
            }
            $scope.uploadFile = function () {
                var e = document.getElementById('upfile');
                e.value = null;
                e.click();
            };
            $scope.fileSelected = function (element) {
                $scope.$apply(function () {
                    var file = element.files[0];
                    currentFileName = file.name;
                    fileReader.readAsArrayBuffer(file);
                });
            };
            $scope.toggleLiveLayer = function (layer) {
                alert('TODO');
            };
            $scope.launchLiveQueryWizard = function () {
                alert('TODO');
            };
            $scope.launchHistoricalQueryWizard = function () {
                tlWizard.launchWizard();
            };
            $scope.launchSummaryQueryWizard = function () {
                alert('TODO');
            };
        }]
    };
}])
;
