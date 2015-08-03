angular.module('stealth.timelapse.geo', [
    'colorpicker.module',
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
        value: 10
    };

    var widgetDef = new WidgetDef('st-timelapse-geo-category', catScope);
    var category = new Category(1, 'Time-enabled', 'fa-clock-o', widgetDef, null, true);
    category.height = 500;
    catMgr.addCategory(1, category);
}])

.directive('stTimelapseGeoCategory', [
'$log',
'$timeout',
'cqlHelper',
'owsLayers',
'ol3Map',
'stealth.timelapse.geo.ol3.layers.LiveWmsLayer',
'tlLayerManager',
'summaryExploreMgr',
'pollingManager',
'stealth.timelapse.stores.BinStore',
'liveWizard',
'tlWizard',
'CONFIG',
function ($log, $timeout, cqlHelper, owsLayers, ol3Map, LiveWmsLayer, tlLayerManager,
          summaryExploreMgr, pollingManager, BinStore, liveWizard, tlWizard, CONFIG) {
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
                        currentStore.setArrayBuffer(arrayBuffer, null, function () {
                            if (!currentStore.getViewState().isError) {
                                $scope.historicalLayer.setDtgBounds();
                            }
                        });

                        // In FF, FileReader holds on to the ArrayBuffer that was loaded last.
                        // This work-around will force fileReader.result to point to a zero-length ArrayBuffer.
                        var ui8a = new Uint8Array([]);
                        fileReader.readAsArrayBuffer(new Blob([ui8a.buffer]));
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
                    Title: title || (layerThisBelongsTo.Title || name),
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
                var clone = newLiveFilterLayer(filterLayer.Name,
                                               filterLayer.Title,
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

            var updateCql = null;
            $scope.handleLiveFilterExtraCqlChange = function (filterLayer, delay) {
                if (!_.isEmpty(filterLayer.options.cql.value)) {
                    filterLayer.options.cql.isSelected = true;
                }
                $timeout.cancel(updateCql);
                updateCql = $timeout(function () {
                    $scope.updateLiveFilterCql(filterLayer);
                }, delay);
            };

            var buildOp = null;
            $scope.handleLiveFilterTextChange = function (filterLayer, delay) {
                var textFields = _.keys(_.get(filterLayer.layerThisBelongsTo.KeywordConfig, 'search.text.field'));
                if (!_.isEmpty(textFields)) {
                    $timeout.cancel(buildOp);
                    buildOp = $timeout(function () {
                        if (_.isString(filterLayer.options.cql.freeText) &&
                            !_.isEmpty(filterLayer.options.cql.freeText.trim())) {
                            filterLayer.cqlFilter = cqlHelper.combine(cqlHelper.operator.OR, _.map(textFields, function (field) {
                                return field + " ILIKE '%" + filterLayer.options.cql.freeText.trim() + "%'";
                            }));
                        } else {
                            filterLayer.cqlFilter = null;
                        }
                        $scope.refreshLiveFilterLayer(filterLayer);
                    }, delay);
                }
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
                $scope.refreshLiveFilterLayer(filterLayer);
            };

            $scope.refreshLiveFilterLayer = function (filterLayer) {
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
            };

            if (_.isUndefined($scope.workspaces)) {
                $scope.workspaces = {
                    live: {},
                    historical: {},
                    summary: summaryExploreMgr.workspaces
                };
                var keywordPrefix = $scope.keywordPrefix || 'timelapse';
                owsLayers.getLayers(keywordPrefix)
                    .then(function (layers) {
                        _.each(layers, function (l) {
                            _.each(['live', 'historical', 'summary'], function (role) {
                                _.forOwn(l.KeywordConfig[keywordPrefix][role], function (value, workspace, obj) {
                                    var layer = _.cloneDeep(l);
                                    layer.hasViewables = function (list) {return !_.isEmpty(list);};
                                    layer.stealthWorkspace = workspace;
                                    if (layer.KeywordConfig[keywordPrefix].live) {
                                        layer.filterLayers = [];
                                    }
                                    if (layer.KeywordConfig[keywordPrefix].summary) {
                                        layer.summaries = [];
                                    }
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
                    var LiveConstructor = $scope.LiveConstructor || LiveWmsLayer;
                    var pollingLayer = new LiveConstructor(layer.Title, requestParams, layer.layerThisBelongsTo, true);
                    var ol3Layer = pollingLayer.getOl3Layer();
                    layer.mapLayerId = pollingLayer.id;
                    layer.viewState.isOnMap = true;
                    layer.viewState.toggledOn = ol3Layer.getVisible();
                    pollingLayer.setRefreshOnMapChange(ol3Map);
                    ol3Map.addLayer(pollingLayer);

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
                }
            };

            $scope.toggleLiveVisibility = function (layer) {
                var mapLayer = ol3Map.getLayerById(layer.mapLayerId);
                var ol3Layer = mapLayer.getOl3Layer();
                ol3Layer.setVisible(!ol3Layer.getVisible());
            };

            $scope.launchLiveQueryWizard = function () {
                liveWizard.launchWizard(null, function (dataSource, cql, title) {
                    var layerThisBelongsTo = _.find(_.flatten(_.map($scope.workspaces.live)), function (layer) {
                        //Name match might not be sufficient, if we start supporting
                        //alternate views of a layer as separate layers.
                        return layer.Name === dataSource.Name;
                    });
                    if (layerThisBelongsTo) {
                        var filterLayer = newLiveFilterLayer(layerThisBelongsTo.Name,
                                                             title,
                                                             {
                                                                showCql: true
                                                             },
                                                             layerThisBelongsTo);
                        filterLayer.options.cql.value = cql === 'INCLUDE' ? null : cql;
                        filterLayer.options.cql.isSelected = true;
                        filterLayer.viewState.isExpanded = true;
                        filterLayer.viewState.isRemovable = true;
                        layerThisBelongsTo.filterLayers.push(filterLayer);
                        $scope.toggleLiveLayer(filterLayer);
                    }
                });
            };

            $scope.toggleSummaryVisibility = function (layer) {
                var mapLayer = ol3Map.getLayerById(layer.mapLayerId);
                var ol3Layer = mapLayer.getOl3Layer();
                ol3Layer.setVisible(!ol3Layer.getVisible());
            };

            $scope.launchHistoricalQueryWizard = function () {
                tlWizard.launchWizard();
            };

            $scope.refreshValChanged = function (refreshInSecs) {
                pollingManager.setPollingInterval(refreshInSecs * 1000);
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

            $scope.toggleSummaryLayer = summaryExploreMgr.toggleSummaryLayer;
            $scope.removeSummaryLayer = summaryExploreMgr.removeSummaryLayer;

            $scope.exportClick = function ($event) {
                var menu = $($event.delegateTarget).parent().prev();
                var visible = menu.is(':visible');
                if (!visible) {
                    $(document).one('click', function() {
                        $(document).one('click', function() {
                            menu.hide();
                        });
                        menu.show().position({
                            my: 'right bottom',
                            at: 'right top',
                            of: $event.delegateTarget
                        });
                    });
                }
            };
        }]
    };
}])

;
