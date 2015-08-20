angular.module('stealth.routeanalysis.geo', [
    'stealth.routeanalysis.popup',
    'stealth.routeanalysis.runner',
    'stealth.routeanalysis.wizard'
])

.run([
'$log',
'$rootScope',
'$timeout',
'ol3Map',
'wfs',
'owsLayers',
'categoryManager',
'routeAnalysisWizard',
'routeAnalysisBuilder',
'stealth.core.geo.ol3.manager.Category',
'stealth.core.utils.WidgetDef',
'stealth.core.geo.ol3.layers.MapLayer',
'CONFIG',
function ($log, $rootScope, $timeout,
          ol3Map, wfs, owsLayers, catMgr,
          routeAnalysisWizard, routeBuilder,
          Category, WidgetDef, MapLayer,
          CONFIG) {
    var tag = 'stealth.routeanalysis.geo: ';
    $log.debug(tag + 'run called');

    var scope = $rootScope.$new();
    scope.workspaces = {};

    scope.toggleLayer = function (derivedLayer, route) {
        if (_.isUndefined(derivedLayer.mapLayerId) || _.isNull(derivedLayer.mapLayerId)) {
            var ol3Source = new ol.source.Vector({
                features: [new ol.Feature({
                    geometry: route.values_.geometry
                })]
            });

            var ol3Layer = new ol.layer.Vector({
                source: ol3Source,
                style: new ol.style.Style({
                    stroke: new ol.style.Stroke({color: derivedLayer.params.fillColor,
                                                 width: 3}),
                    fill: new ol.style.Fill({color: derivedLayer.params.fillColor})
                })
            });

            var mapLayer = new MapLayer(derivedLayer.title, ol3Layer, false, 20);
            mapLayer.styleDirective = 'st-routeanalysis-layer-style';
            mapLayer.styleDirectiveScope.styleVars.iconClass = 'fa fa-fw fa-bar-chart';
            mapLayer.styleDirectiveScope.derivedLayer = derivedLayer;
            ol3Layer.mapLayerId = mapLayer.id;
            derivedLayer.mapLayerId = mapLayer.id;
            derivedLayer.viewState.isOnMap = true;
            derivedLayer.viewState.toggledOn = ol3Layer.getVisible();
            derivedLayer.viewState.isDraggable = true;
            ol3Map.addLayer(mapLayer);

            ol3Layer.on('change:visible', function () {
                $timeout(function () {
                    derivedLayer.viewState.toggledOn = ol3Layer.getVisible();
                });
            });

            derivedLayer.viewState.isLoading = true;
            derivedLayer.routeanalysis = {
                id: _.now(),
                viewState: {
                    toggledOn: false,
                    isLoading: false,
                    isWizardInProgress: !!scope.isWizardInProgress
                },
                layerId: derivedLayer.mapLayerId,
                fillColor: derivedLayer.viewState.fillColor
            };

            scope.updateRouteAnalysis(derivedLayer.mapLayerId);
        } else {
            ol3Map.removeLayerById(derivedLayer.mapLayerId);
            delete derivedLayer.mapLayerId;
            derivedLayer.viewState.isOnMap = false;
            derivedLayer.viewState.toggledOn = false;
        }
    };

    scope.removeLayer = function (gsLayer, derivedLayer) {
        if (!_.isUndefined(derivedLayer.routeanalysis)) {
            if (derivedLayer.routeanalysis.viewState.toggledOn) {
                derivedLayer.routeanalysis.closePopup(derivedLayer.routeanalysis);
            }
            delete derivedLayer.routeanalysis;
        }
        if (derivedLayer.viewState.isOnMap) {
            scope.toggleLayer(derivedLayer);
        }
        _.pull(gsLayer.derivedLayers, derivedLayer);
    };

    scope.toggleVisibility = function (derivedLayer) {
        var mapLayer = ol3Map.getLayerById(derivedLayer.mapLayerId);
        var ol3Layer = mapLayer.getOl3Layer();
        ol3Layer.setVisible(!ol3Layer.getVisible());
    };

    scope.updateRouteAnalysisTitle = function (derivedLayer) {
        derivedLayer.routeanalysis.title = derivedLayer.title;
    };

    scope.setYAxisLabel = function (derivedLayer, label) {
        derivedLayer.routeanalysis.yAxis = label;
    };

    scope.showRouteAnalysis = function (routeanalysis) {
        if (routeanalysis.viewState.toggledOn) {
            if (routeanalysis.viewState.isLoading) {
                routeanalysis.viewState.isLoading = false;
            }
        } else {
            routeBuilder.build(routeanalysis);
            routeanalysis.viewState.toggledOn = true;
        }
    };

    scope.updateRouteAnalysis = function (id) {
        var derivedLayers = _.flattenDeep(_.reduce(scope.workspaces, function (previous, value) {
            previous.push(_.pluck(value, 'derivedLayers'));
            return previous;
        }, []));

        var derivedLayer = _.find(derivedLayers, function (lyr) {
            return lyr.mapLayerId === id;
        });

        if (_.isUndefined(derivedLayer) || derivedLayer.routeanalysis.viewState.isLoading) {
            return;
        }

        if (_.isUndefined(derivedLayer.routeanalysis) && derivedLayer.routeanalysis.viewState.isLoading) {
            return;
        }

        if (!_.isUndefined(derivedLayer.routeanalysis.query)) {
            var cql = derivedLayer.routeanalysis.query.params.cql;
            derivedLayer.query.params.cql = (cql === '' || _.isNull(cql)) ? null : cql;
        }

        derivedLayer.viewState.isLoading = false;
        derivedLayer.routeanalysis.viewState.isLoading = true;
        derivedLayer.routeanalysis.title = derivedLayer.title;
        if (_.isUndefined(derivedLayer.routeanalysis.arrowColor)) {
            derivedLayer.routeanalysis.arrowColor = derivedLayer.params.arrowColor;
        }

        // re-query if we end up being able to change the raster
    };

    scope.launchRouteAnalysisWizard = function (gsLayer) {
        routeAnalysisWizard.launch(gsLayer);
    };

    scope.deregLaunchWizardListener = $rootScope.$on('wizard:launchWizard', function () {
        _.each(scope.workspaces, function (gsLayers) {
            _.each(gsLayers, function (gsLayer) {
                _.each(gsLayer.derivedLayers, function (derivedLayer) {
                    scope.isWizardInProgress = true;
                    derivedLayer.viewState.isWizardInProgress = true;
                    var ol3Layer = ol3Map.getLayerById(derivedLayer.mapLayerId).getOl3Layer();
                    ol3Layer.draggable = false;
                });
            });
        });
    });

    scope.deregCloseWizardListener = $rootScope.$on('wizard:closeWizard', function () {
        _.each(scope.workspaces, function (gsLayers) {
            _.each(gsLayers, function (gsLayer) {
                _.each(gsLayer.derivedLayers, function (derivedLayer) {
                    scope.isWizardInProgress = false;
                    derivedLayer.viewState.isWizardInProgress = false;

                    if (_.isUndefined(derivedLayer.gsLayer)) {
                        // incomplete run, remove
                        scope.removeLayer(gsLayer, derivedLayer);
                    }
                });
            });
        });
    });

    var getFeatureTypeDescription = function (gsLayer) {
        wfs.getFeatureTypeDescription(CONFIG.geoserver.defaultUrl,
                                      gsLayer.Name,
                                      CONFIG.geoserver.omitProxy)
        .then(
            function (description) {
                gsLayer.featureTypeDescription = description;
            }
        );
    };

    $rootScope.$on('updateRouteAnalysisLayers', function () {
        updateRouteAnalysisLayers();
    });

    var updateRouteAnalysisLayers = function () {
        getRouteAnalysisLayers(true);
    };

    var getRouteAnalysisLayers = function (checkForDuplicates, skipRefresh) {
        var keywordPrefix = 'routeanalysis';
        owsLayers.getLayers(keywordPrefix, !skipRefresh)
            .then(function (layers) {
                $log.debug('owsLayers.getLayers()');
                _.each(layers, function (l) {
                    var gsLayer = _.cloneDeep(l);
                    gsLayer.derivedLayers = [];
                    getFeatureTypeDescription(gsLayer);

                    _.each(_.get(gsLayer.KeywordConfig, keywordPrefix), function (workspaceObj) {
                        _.each(_.keys(workspaceObj), function (workspace) {
                            if (_.isArray(scope.workspaces[workspace])) {
                                if (checkForDuplicates) {
                                    if (!_.any(scope.workspaces[workspace], {Name: gsLayer.Name})) {
                                        scope.workspaces[workspace].push(gsLayer);
                                    }
                                } else {
                                    scope.workspaces[workspace].push(gsLayer);
                                }
                            } else {
                                scope.workspaces[workspace] = [gsLayer];
                            }
                        });
                    });
                });
            });
    };

    getRouteAnalysisLayers(false, true);

    routeAnalysisWizard.setCategoryScope(scope);

    var widgetDef = new WidgetDef('st-route-analysis-geo-category', scope);
    var category = new Category(1, 'Route Analysis', 'fa-line-chart', widgetDef, null, true);
    catMgr.addCategory(1, category);
}])

.directive('stRouteAnalysisGeoCategory', [
'$log',
function ($log) {
    var tag = 'stealth.routeanalysis.geo.stRouteAnalysisGeoCategory: ';
    $log.debug(tag + 'directive defined');
    return {
        templateUrl: 'routeanalysis/geo/category.tpl.html'
    };
}])

;
