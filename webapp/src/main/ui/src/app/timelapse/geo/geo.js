angular.module('stealth.timelapse.geo', [
    'colorpicker.module',
    'frapontillo.bootstrap-switch',
    'stealth.core.utils',
    'stealth.timelapse.geo.ol3.layers',
    'stealth.timelapse.stores',
    'stealth.timelapse.wizard'
])

.run([
'$rootScope',
'categoryManager',
'stealth.core.geo.ol3.manager.Category',
'stealth.core.utils.WidgetDef',
function ($rootScope, catMgr, Category, WidgetDef) {
    var catScope = $rootScope.$new();
    catScope.timelapse = {
        isLiveOn: true,
        isHistoricalOn: true,
        isSummaryOn: true
    };
    catScope.liveRefresh = {
        value: 10,
        options: [2, 5, 10, 30, 60]
    };

    var widgetDef = new WidgetDef('st-timelapse-geo-category', catScope);
    var category = new Category(0, 'Time-enabled', 'fa-clock-o', widgetDef, null, true);
    category.height = 500;
    catMgr.addCategory(1, category);
}])

.directive('stTimelapseGeoCategory', [
'$log',
'$timeout',
'$q',
'$http',
'$filter',
'owsLayers',
'ol3Map',
'stealth.timelapse.geo.ol3.layers.PollingImageWmsLayer',
'tlLayerManager',
'stealth.timelapse.stores.BinStore',
'colors',
'tlWizard',
'mapClickSearchService',
'CONFIG',
function ($log, $timeout, $q, $http, $filter, owsLayers, ol3Map, PollingImageWmsLayer, tlLayerManager,
          BinStore, colors, tlWizard, mapClickSearchService, CONFIG) {
    var tag = 'stealth.core.geo.context.stTimelapseGeoCategory: ';
    $log.debug(tag + 'directive defined');
    return {
        templateUrl: 'timelapse/geo/category.tpl.html',
        controller: ['$scope', function ($scope) {
            var currentStore;
            var fileReader = new FileReader();
            fileReader.onload = function (e) {
                $timeout(function () { // Prevents '$apply already in progress' error
                    var arrayBuffer = fileReader.result;
                    if (arrayBuffer.byteLength > 0) {
                        currentStore.setArrayBuffer(arrayBuffer);
                        $scope.historicalLayer.setDtgBounds();
                    }
                });
            };

            $scope.historicalLayer = tlLayerManager.getHistoricalLayer();

            $scope.historicalChanged = function () {
                $scope.historicalLayer.setDtgBounds();
            };

            $scope.removeHistorical = function (store) {
                store.destroy();
                $scope.historicalLayer.removeStore(store);

                // In FF, FileReader holds on to the ArrayBuffer that was loaded last.
                // This work-around will force fileReader.result to point to a zero-length ArrayBuffer.
                var ui8a = new Uint8Array([]);
                fileReader.readAsArrayBuffer(new Blob([ui8a.buffer]));
            };

            $scope.collapseAllLiveFilterLayers = function (layers) {
                _.each(layers, function (layer) {
                    layer.viewState.isExpanded = false;
                });
            };

            $scope.expandAllLiveFilterLayers = function (layers) {
                _.each(layers, function (layer) {
                    layer.viewState.isExpanded = true;
                });
            };

            var filterLayerCount = {};
            function newLiveFilterLayer (name, title, options, layerThisBelongsTo) {
                if (_.isNumber(filterLayerCount[name])) {
                    filterLayerCount[name]++;
                } else {
                    filterLayerCount[name] = 1;
                }
                var filterLayer = {
                    cnt: filterLayerCount[name],
                    layerThisBelongsTo: layerThisBelongsTo,
                    Name: name,
                    Title: title || ((layerThisBelongsTo.Title || name) + ' (Options ' + filterLayerCount[name] + ')'),
                    viewState: {
                        isOnMap: false,
                        toggledOn: false,
                        isLoading: false,
                        isExpanded: false,
                        isRemovable: false
                    },
                    options: options,
                    cqlFilter: null
                };
                filterLayer.options.cql = {
                    value: null,
                    isSelected: false
                };

                return filterLayer;
            }

            $scope.cloneLiveFilterLayer = function (filterLayer) {
                var title = 'Copy of ' + filterLayer.Title;
                var clone = newLiveFilterLayer(angular.copy(filterLayer.Name),
                                               title,
                                               angular.copy(filterLayer.options),
                                               filterLayer.layerThisBelongsTo);

                clone.viewState.isExpanded = true;
                clone.viewState.isRemovable = true;
                $scope.updateLiveFilterCql(clone);
                filterLayer.layerThisBelongsTo.filterLayers.push(clone);
            };

            $scope.removeLiveFilterLayer = function (filterLayer) {
                if (filterLayer.viewState.isOnMap) {
                    $scope.toggleLiveLayer(filterLayer);
                }
                _.pull(filterLayer.layerThisBelongsTo.filterLayers, filterLayer);
            };

            $scope.updateLiveLayerName = function (filterLayer) {
                var id = filterLayer.mapLayerId;
                if (!_.isUndefined(id)) {
                    var pollingLayer = ol3Map.getLayerById(id);
                    pollingLayer.setName(filterLayer.Title);
                }
            };

            $scope.handleLiveFilterExtraCqlChange = function (filterLayer) {
                if (!_.isEmpty(filterLayer.options.cql.value)) {
                    filterLayer.options.cql.isSelected = true;
                }
                $scope.updateLiveFilterCql(filterLayer);
            };

            $scope.updateLiveFilterCql = function (filterLayer) {
                filterLayer.cqlFilter = '';

                var attrsList = filterLayer.options.attrs;

                // Build array of OR-ed choices.
                if (!_.isUndefined(attrsList)) {
                    filterLayer.cqlFilter = _.map(attrsList, function (attr) {
                        var choices = attr.choices;

                        var accumulator = '';
                        var filter = _.reduce(
                            choices,
                            function (result, choice) {
                                var term = '';
                                if (choice.isSelected) {
                                    if (result !== '') {
                                        term = ' OR ';
                                    }
                                    term += attr.name + ' = ' + choice.value;
                                }
                                return result + term;
                            },
                            accumulator
                        );

                        if (filter !== '') {
                            return '(' + filter + ')';
                        } else {
                            return filter;
                        }
                    });
                }

                // Build string of AND-ed attributes.
                if (filterLayer.cqlFilter.length > 0) {
                    var accumulator = '';
                    filterLayer.cqlFilter = _.reduce(filterLayer.cqlFilter, function (result, filter) {
                        var term = '';
                        if (result !== '' && filter !== '') {
                            term = ' AND ';
                        }
                        term += filter;
                        return result + term;
                    }, accumulator);
                }

                // AND extra CQL if present.
                if (filterLayer.options.cql.value !== null && filterLayer.options.cql.value !== '') {
                    if (filterLayer.options.cql.isSelected) {
                        if (filterLayer.cqlFilter !== '') {
                            filterLayer.cqlFilter += ' AND ' + filterLayer.options.cql.value;
                        } else {
                            filterLayer.cqlFilter  = filterLayer.options.cql.value;
                        }
                    }
                }

                // Update request.
                var id = filterLayer.mapLayerId;
                if (!_.isUndefined(id)) {
                    var pollingLayer = ol3Map.getLayerById(id);
                    var requestParams = {
                        LAYERS: filterLayer.Name,
                        CQL_FILTER: 'INCLUDE'
                    };
                    if (!_.isUndefined(filterLayer.cqlFilter) && filterLayer.cqlFilter !== '') {
                        requestParams.CQL_FILTER = filterLayer.cqlFilter;
                    }
                    pollingLayer.refresh(requestParams);
                }
                $scope.refreshNow();
            };

            if (_.isUndefined($scope.workspaces)) {
                $scope.workspaces = {
                    live: {},
                    historical: {},
                    summary: tlLayerManager.getSummaryExploreManager().workspaces
                };
                owsLayers.getLayers('timelapse')
                    .then(function (layers) {
                        _.each(layers, function (l) {
                            var layer = _.cloneDeep(l);
                            layer.hasViewables = function (list) {return !_.isEmpty(list);};
                            if (layer.KeywordConfig.timelapse.live) {
                                layer.filterLayers = [];
                            }
                            if (layer.KeywordConfig.timelapse.summary) {
                                layer.summaries = [];
                            }
                            _.each(['live', 'historical', 'summary'], function (role) {
                                _.forOwn(layer.KeywordConfig.timelapse[role], function (value, workspace, obj) {
                                    if (_.isArray($scope.workspaces[role][workspace])) {
                                        $scope.workspaces[role][workspace].push(layer);
                                    } else {
                                        $scope.workspaces[role][workspace] = [layer];
                                    }
                                    // Configured live filter layers
                                    if (role == 'live') {
                                        var found = _.find(CONFIG.map.liveOptions, {KeywordWorkspace: workspace});
                                        if (found) {
                                            var options = CONFIG.map.liveOptions;
                                            _.each(options, function (theOptions) {
                                                if (theOptions.KeywordWorkspace == workspace) {
                                                    var filterLayer = newLiveFilterLayer(layer.Name, theOptions.Title, angular.copy(theOptions), layer);
                                                    if (filterLayer.cnt === 1) {
                                                        filterLayer.viewState.isExpanded = true;
                                                    }
                                                    $scope.updateLiveFilterCql(filterLayer);
                                                    layer.filterLayers.push(filterLayer);
                                                }
                                            });
                                        } else {
                                            var filterLayer = newLiveFilterLayer(layer.Name, null, {}, layer);
                                            if (filterLayer.cnt === 1) {
                                                filterLayer.viewState.isExpanded = true;
                                            }
                                            $scope.updateLiveFilterCql(filterLayer);
                                            layer.filterLayers.push(filterLayer);
                                        }
                                    }
                                });
                            });
                        });
                    });
            }
            $scope.readHistoricalBinFile = function (file) {
                currentStore = new BinStore(file.name);
                $scope.historicalLayer.addStore(currentStore);
                fileReader.readAsArrayBuffer(file);
            };
            $scope.toggleLiveLayer = function (layer) {
                if (_.isUndefined(layer.mapLayerId) || _.isNull(layer.mapLayerId)) {
                    var requestParams = {
                        LAYERS: layer.Name,
                        CQL_FILTER: 'INCLUDE'
                    };
                    var pollingLayer = new PollingImageWmsLayer(layer.Title, requestParams);
                    pollingLayer.setPollingInterval($scope.liveRefresh.value * 1000);
                    var ol3Layer = pollingLayer.getOl3Layer();
                    layer.mapLayerId = pollingLayer.id;
                    layer.viewState.isOnMap = true;
                    layer.viewState.toggledOn = ol3Layer.getVisible();
                    pollingLayer.styleDirectiveScope.styleVars.iconClass = 'fa fa-fw fa-lg fa-clock-o';
                    pollingLayer.setRefreshOnMapChange(ol3Map);
                    ol3Map.addLayer(pollingLayer);

                    var capabilities = layer.layerThisBelongsTo.KeywordConfig.capability || {};
                    if (!_.isUndefined(capabilities['summary'])) {
                        capabilities['summary']['toolTipText'] = 'Get summary';
                        capabilities['summary']['iconClass'] = 'fa-location-arrow';
                        capabilities['summary']['onClick'] = tlLayerManager.getSummaryExploreManager().summaryQuery;
                    }
                    layer.searchId = mapClickSearchService.registerSearchable(function (coord, res) {
                        if (pollingLayer.getOl3Layer().getVisible()) {
                            var url = pollingLayer.getOl3Layer().getSource().getGetFeatureInfoUrl(
                                coord, res, CONFIG.map.projection, {
                                    INFO_FORMAT: 'application/json',
                                    FEATURE_COUNT: 999999,
                                    BUFFER: 5 //more generous search radius because live layer moves
                                }
                            );
                            return $http.get($filter('cors')(url, null, CONFIG.geoserver.omitProxy))
                                .then(function (response) {
                                    return {
                                        name: layer.Title,
                                        records: _.pluck(response.data.features, 'properties'),
                                        layerFill: {
                                            display: 'none'
                                        },
                                        capabilities: capabilities
                                    };
                                }, function (response) {
                                    return {
                                        name: layer.Title,
                                        records: [],
                                        isError: true,
                                        reason: 'Server error'
                                    };
                                });
                        } else {
                            return $q.when({name: layer.Title, records:[]}); //empty results
                        }
                    });
                    $scope.updateLiveFilterCql(layer);

                    pollingLayer.styleDirectiveScope.$on(pollingLayer.id + ':isLoading', function (e) {
                        layer.viewState.isLoading = true;
                        e.stopPropagation();
                    });
                    pollingLayer.styleDirectiveScope.$on(pollingLayer.id + ':finishedLoading', function (e) {
                        layer.viewState.isLoading = false;
                        e.stopPropagation();
                    });

                    // Update viewState on layer visibility change.
                    ol3Layer.on('change:visible', function () {
                        $timeout(function () {
                            layer.viewState.toggledOn = ol3Layer.getVisible();
                        });
                    });

                } else {
                    var l = ol3Map.getLayerById(layer.mapLayerId);
                    l.cancelPolling();
                    l.removeRefreshOnMapChange(ol3Map);
                    ol3Map.removeLayerById(layer.mapLayerId);
                    delete layer.mapLayerId;
                    layer.viewState.isOnMap = false;
                    layer.viewState.toggledOn = false;
                    if (_.isNumber(layer.searchId)) {
                        mapClickSearchService.unregisterSearchableById(layer.searchId);
                        delete layer.searchId;
                    }
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

            $scope.toggleSummaryVisibility = function (layer) {
                var mapLayer = ol3Map.getLayerById(layer.mapLayerId);
                var ol3Layer = mapLayer.getOl3Layer();
                ol3Layer.setVisible(!ol3Layer.getVisible());
            };

            $scope.launchHistoricalQueryWizard = function () {
                tlWizard.launchWizard();
            };

            $scope.launchSummaryQueryWizard = function () {
                alert('TODO');
            };

            $scope.refreshValChanged = function (refreshInSecs) {
                _.each($scope.workspaces.live, function (ws) {
                    _.each(ws, function (layer) {
                        _.each(layer.filterLayers, function (filterLayer) {
                            var id = filterLayer.mapLayerId;
                            if (!_.isUndefined(id) && !_.isNull(id)) {
                                var l = ol3Map.getLayerById(id);
                                if (!_.isUndefined(l)) {
                                    l.setPollingInterval(refreshInSecs * 1000);
                                }
                            }
                        });
                    });
                });
            };

            $scope.refreshNow = function () {
                _.each($scope.workspaces.live, function (ws) {
                    _.each(ws, function (layer) {
                        _.each(layer.filterLayers, function (filterLayer) {
                            var id = filterLayer.mapLayerId;
                            if (!_.isUndefined(id) && !_.isNull(id)) {
                                var l = ol3Map.getLayerById(id);
                                if (!_.isUndefined(l)) {
                                    l.refresh();
                                }
                            }
                        });
                    });
                });
            };

            function toggleSlideVis (workspaces, visibleLayers, isOn) {
                if (isOn) {
                    _.each(workspaces, function (ws) {
                        _.each(ws, function (layer) {
                            var subLayers = layer.filterLayers || layer.summaries;
                            _.each(subLayers, function (subLayer) {
                                var id = subLayer.mapLayerId;
                                if (!_.isUndefined(id) && !_.isNull(id)) {
                                    var l = ol3Map.getLayerById(id);
                                    if (!_.isUndefined(l)) {
                                        var ol3Layer = l.getOl3Layer();
                                        if (ol3Layer.getVisible()) {
                                            visibleLayers.push(ol3Layer);
                                            ol3Layer.setVisible(false);
                                        }
                                    }
                                }
                            });
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

            var _summaryLayersVisible = [];
            $scope.toggleSlideSummary = function (isOn) {
                $log.debug(tag + 'toggleSlideSummary');
                _summaryLayersVisible = toggleSlideVis($scope.workspaces.summary, _summaryLayersVisible, isOn);
                $scope.timelapse.isSummaryOn = !isOn;
            };

            $scope.toggleSummaryLayer = tlLayerManager.getSummaryExploreManager().toggleSummaryLayer;
            $scope.removeSummaryLayer = tlLayerManager.getSummaryExploreManager().removeSummaryLayer;
        }]
    };
}])

;
