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
'$timeout',
'wms',
'ol3Map',
'stealth.timelapse.geo.ol3.layers.PollingWmsLayer',
'tlLayerManager',
'stealth.timelapse.stores.BinStore',
'colors',
'tlWizard',
'CONFIG',
function ($log, $timeout, wms, ol3Map, PollingWmsLayer, tlLayerManager, BinStore, colors, tlWizard, CONFIG) {
    var tag = 'stealth.core.geo.context.stTimelapseGeoCategory: ';
    $log.debug(tag + 'directive defined');
    return {
        templateUrl: 'timelapse/geo/category.tpl.html',
        controller: ['$scope', function ($scope) {
            var currentFileName = 'unknown';
            var currentStore;
            var fileReader = new FileReader();
            fileReader.onload = function (e) {
                $timeout(function () { // Prevents '$apply already in progress' error
                    currentStore.setArrayBuffer(fileReader.result);
                    $scope.historicalLayer.setDtgBounds();
                });
            };

            $scope.historicalLayer = tlLayerManager.getHistoricalLayer();

            $scope.historicalChanged = function () {
                $scope.historicalLayer.setDtgBounds();
            };

            $scope.removeHistorical = function (store) {
                $scope.historicalLayer.removeStore(store);
            };

            $scope.timelapse = {
                mode: 'historical',
                isLiveOn: true,
                isHistoricalOn: true,
                summaryOn: true
            };
            if (_.isUndefined($scope.workspaces)) {
                $scope.workspaces = {
                    live: {},
                    historical: {},
                    summary: {}
                };
                wms.getCapabilities(CONFIG.geoserver.defaultUrl, CONFIG.geoserver.omitProxy)
                    .then(function (wmsCap) {
                        _.each(wmsCap.Capability.Layer.Layer, function (l) {
                            _.each(l.KeywordList, function (keyword) {
                                var keywordParts = keyword.split('.');
                                if (keywordParts.length > 3 && keywordParts[0] === CONFIG.app.context &&
                                        keywordParts[1] === 'timelapse') {
                                    var layer = _.cloneDeep(l);
                                    layer.viewState = {
                                        isOnMap: false,
                                        toggledOn: false,
                                        isLoading: false
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
                    currentStore = new BinStore(file.name);
                    tlLayerManager.getHistoricalLayer().addStore(currentStore);
                    fileReader.readAsArrayBuffer(file);
                });
            };
            $scope.toggleLiveLayer = function (layer) {
                if (_.isUndefined(layer.mapLayerId) || _.isNull(layer.mapLayerId)) {
                    var requestParams = {
                        LAYERS: layer.Name
                        //CQL_FILTER: 'BBOX(geom,-90,-180,90,180) AND dtg DURING 2014-01-01T00:00:00.000Z/2014-01-01T00:10:00.000Z'
                        //STYLES: ''
                        //SLD: ''
                    };
                    var preload = 0;
                    var wmsLayer = new PollingWmsLayer(layer.Title, requestParams, preload);
                    wmsLayer.setPollingInterval($scope.liveRefresh.value * 1000);
                    var ol3Layer = wmsLayer.getOl3Layer();
                    layer.mapLayerId = wmsLayer.id;
                    layer.viewState.isOnMap = true;
                    layer.viewState.toggledOn = ol3Layer.getVisible();
                    wmsLayer.styleDirectiveScope.styleVars.iconClass = 'fa fa-fw fa-lg fa-clock-o';
                    ol3Map.addLayer(wmsLayer);

                    // Update viewState on layer visibility change.
                    ol3Layer.on('change:visible', function () {
                        $timeout(function () {
                            layer.viewState.toggledOn = ol3Layer.getVisible();
                        });
                    });

                    wmsLayer.styleDirectiveScope.$on(layer.Title + ':isLoading', function (e, tilesCnt) {
                        layer.viewState.isLoading = true;
                        layer.viewState.numLoaded = tilesCnt.total - tilesCnt.loading;
                        layer.viewState.numTiles = tilesCnt.total;
                        e.stopPropagation();
                    });

                    wmsLayer.styleDirectiveScope.$on(layer.Title + ':finishedLoading', function (e) {
                        layer.viewState.isLoading = false;
                        e.stopPropagation();
                    });
                } else {
                    ol3Map.removeLayerById(layer.mapLayerId);
                    delete layer.mapLayerId;
                    layer.viewState.isOnMap = false;
                    layer.viewState.toggledOn = false;
                }
            };

            $scope.toggleLiveVisibility = function (layer) {
                var mapLayer = ol3Map.getLayerById(layer.mapLayerId);
                var ol3Layer = mapLayer.getOl3Layer();
                ol3Layer.setVisible(!ol3Layer.getVisible());
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

            $scope.liveRefresh = {
                value: 20,
                options: _.range(0, 65, 5)
            };

            $scope.refreshValChanged = function (refreshInSecs) {
                _.each($scope.workspaces.live, function (ws) {
                    _.each(ws, function (layer) {
                        var id = layer.mapLayerId;
                        if (!_.isUndefined(id) && !_.isNull(id)) {
                            var l = ol3Map.getLayerById(id);
                            if (!_.isUndefined(l)) {
                                l.setPollingInterval(refreshInSecs * 1000);
                            }
                        }
                    });
                });
            };

            $scope.refreshNow = function () {
                _.each($scope.workspaces.live, function (ws) {
                    _.each(ws, function (layer) {
                        var id = layer.mapLayerId;
                        if (!_.isUndefined(id) && !_.isNull(id)) {
                            var l = ol3Map.getLayerById(id);
                            if (!_.isUndefined(l)) {
                                l.refresh();
                            }
                        }
                    });
                });
            };

            function toggleSlideVis (workspaces, visibleLayers, isOn) {
                if (isOn) {
                    _.each(workspaces, function (ws) {
                        $log.debug(workspaces);
                        _.each(ws, function (layer) {
                            var id = layer.mapLayerId;
                            if (!_.isUndefined(id) && !_.isNull(id)) {
                                var l = ol3Map.getLayerById(id);
                                if (!_.isUndefined(l)) {
                                    var ol3Layer = l.getOl3Layer();
                                    if (ol3Layer.getVisible()) {
                                        $log.debug(ol3Layer);
                                        visibleLayers.push(ol3Layer);
                                        ol3Layer.setVisible(false);
                                    }
                                }
                            }
                        });
                    });
                } else {
                    _.each(visibleLayers, function (l) {
                        l.setVisible(true);
                        visibleLayers = [];
                        visibleLayers.length = 0;
                    });
                }
                return visibleLayers;
            }

            var _liveLayersVisible = [];
            $scope.toggleSlideLive = function (isOn) {
                $log.debug(tag + 'toggleSlideLive');
                _liveLayersVisible = toggleSlideVis($scope.workspaces.live, _liveLayersVisible, isOn);
                $scope.timelapse.isLiveOn = !isOn;
            };

            var _historicalStoresVisible = [];
            $scope.toggleSlideHistorical = function (isOn) {
                $log.debug(tag + 'toggleSlideHistorical');
                if (isOn) {
                    var stores = $scope.historicalLayer.getStores();
                    _historicalStoresVisible = _.filter(stores, function (store) {
                        return store.getViewState().toggledOn;
                    });
                    _.each(_historicalStoresVisible, function (store) {
                        store.toggleVisibility();
                    });
                } else {
                    _.each(_historicalStoresVisible, function (store) {
                        store.toggleVisibility();
                    });
                    _historicalStoresVisible = [];
                    _historicalStoresVisible.length = 0;
                }
                $scope.timelapse.isHistoricalOn = !isOn;
            };
        }]
    };
}])
;
