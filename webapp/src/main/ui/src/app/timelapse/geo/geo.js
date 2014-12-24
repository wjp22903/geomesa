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
                wms.getCapabilities(CONFIG.geoserver.defaultUrl, CONFIG.geoserver.omitProxy)
                    .then(function (wmsCap) {
                        _.each(wmsCap.Capability.Layer.Layer, function (l) {
                            _.each(l.KeywordList, function (keyword) {
                                var keywordParts = keyword.split('.');
                                if (keywordParts.length > 3 && keywordParts[0] === CONFIG.app.context &&
                                        keywordParts[1] === 'timelapse') {
                                    var layer = _.cloneDeep(l);
                                    layer.categoryViewState = {
                                        toggledOn: false
                                    };
                                    var workspace = keywordParts[3];
                                    if (_.contains(['live', 'historical', 'summary'], keywordParts[2])) {
                                        if (_.isArray($scope.workspaces[keywordParts[2]][workspace])) {
                                            $scope.workspaces[keywordParts[2]][workspace].push(layer);
                                        } else {
                                            $scope.workspaces[keywordParts[2]][workspace] = [layer];
                                        }
                                    }
                                }
                            });
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
