angular.module('stealth.grizzlybear.geo', [
    'stealth.core.utils'
])

.run([
'$rootScope',
'$timeout',
'categoryManager',
'stealth.core.geo.ol3.manager.Category',
'stealth.core.utils.WidgetDef',
'owsLayers',
'ol3Map',
'stealth.grizzlybear.geo.query.CQLGenerator',
'stealth.core.geo.ol3.layers.WmsLayer',
'stealth.core.geo.ol3.layers.XYZLayer',
'CONFIG',
function ($rootScope, $timeout, catMgr, Category, WidgetDef, owsLayers, ol3Map, cqlGenerator,
          WmsLayer, XYZLayer, CONFIG) {
    var categoryScope = $rootScope.$new();
    categoryScope.workspaces = {};
    $rootScope.grizzlyBearScope = categoryScope;

    categoryScope.toggleLayer = function (layer, workspace) {
        if (_.isUndefined(layer.mapLayerId) || _.isNull(layer.mapLayerId)) {
            var ol3Layer;
            var requestParams = {
                LAYERS: layer.Name
            };
            var portableLayer = new WmsLayer({
                name: layer.Title,
                requestParams: requestParams,
                queryable: layer.queryable,
                opacity: layer.viewState.lastOpacity,
                zIndexHint: (workspace.toLowerCase().indexOf('base') === 0 ? -20 : -10),
                wmsUrl: layer.serverUrl,
                isTiled: _.has(layer.KeywordConfig, 'capability.tiled'),
                wfsUrl: layer.wfsUrl,
                useProxyForWfs: layer.useProxyForWfs,
                layerThisBelongsTo: layer
            });

            portableLayer.applyCql(layer.cqlFilter);
            ol3Layer = portableLayer.getOl3Layer();
            layer.mapLayerId = portableLayer.id;
            layer.viewState.isOnMap = true;
            layer.viewState.toggledOn = ol3Layer.getVisible();
            portableLayer.styleDirectiveScope.styleVars.iconClass = 'fa fa-fw fa-lg fa-compass';
            ol3Map.addLayer(portableLayer);
            // Update viewState on layer visibility change.
            ol3Layer.on('change:visible', function () {
                $timeout(function () {
                    layer.viewState.toggledOn = ol3Layer.getVisible();
                });
            });

            portableLayer.styleDirectiveScope.$on(portableLayer.id + ':isLoading', function (e) {
                layer.viewState.isLoading = true;
                e.stopPropagation();
            });

            portableLayer.styleDirectiveScope.$on(portableLayer.id + ':finishedLoading', function (e) {
                layer.viewState.isLoading = false;
                e.stopPropagation();
            });
        } else {
            layer.viewState.lastOpacity = ol3Map.getLayerById(layer.mapLayerId).getOl3Layer().getOpacity();
            ol3Map.removeLayerById(layer.mapLayerId);
            delete layer.mapLayerId;
            layer.viewState.isOnMap = false;
            layer.viewState.toggledOn = false;
        }
    };

    categoryScope.toggleVisibility = function (layer) {
        var mapLayer = ol3Map.getLayerById(layer.mapLayerId);
        var ol3Layer = mapLayer.getOl3Layer();
        ol3Layer.setVisible(!ol3Layer.getVisible());
    };

    categoryScope.updateLayerCql = function (layer) {
        if (!_.isUndefined(layer.mapLayerId)) {
            var mapLayer = ol3Map.getLayerById(layer.mapLayerId);
            if (mapLayer) {
                mapLayer.applyCql(layer.cqlFilter);
            }
        }
    };

    var keywordPrefix = 'grizzlyBear';
    categoryScope.prepAndInitLayers = function (layer) {
        layer.viewState = {
            isOnMap: false,
            toggledOn: false,
            isLoading: false,
            lastOpacity: 1
        };
        layer.getTooltip = function () {
            if (layer.viewState.isOnMap) {
                return 'Remove from map';
            }
            return 'Add to map';
        };
        _.each(_.keys(_.get(layer.KeywordConfig, keywordPrefix)), function (workspace) {
            if (_.isArray(categoryScope.workspaces[workspace])) {
                categoryScope.workspaces[workspace].push(layer);
            } else {
                categoryScope.workspaces[workspace] = [layer];
            }
            //Turn on configured layers
            if (layer.Name) {
                categoryScope.setConfig(layer);

                var search = {Name: layer.Name};
                if (layer.serverUrl) {
                    search.serverUrl = layer.serverUrl;
                }
                var initLayer = _.find(CONFIG.map.initLayers, search);
                if (initLayer) {
                    layer.viewState.isOnMap = true;
                    layer.viewState.toggledOn = true;
                    layer.viewState.lastOpacity = initLayer.opacity || layer.viewState.lastOpacity;
                    categoryScope.toggleLayer(layer, workspace);
                }
            }
        });
    };

    categoryScope.layersNotRequireFilter = ["cv_all_dem", "va_vbmp_alb_cho_roads"];

    categoryScope.layersRequireTime = ["PowerReading", "Sector", "Centroid", "Triangulation",
        "TriangulationBestServer", "Prediction", "BestServer", "PredictedSector", "BruteForceMatch",
        "BruteForcePrediction", "BruteForceBestServer"];

    categoryScope.layersRequireExtraFilter = ["Triangulation", "Prediction", "BruteForcePrediction"];

    categoryScope.attributeMap = {
        "PowerReading": "cellId",
        "Sector": "cellId",
        "Centroid": "cellId",
        "Triangulation": "cellId",
        "TriangulationBestServer": "",
        "Prediction": "cellId",
        "BestServer": "",
        "PredictedSector": "cellId",
        "BruteForceMatch": "cellId",
        "BruteForcePrediction": "cellId",
        "BruteForceBestServer": ""
    };

    categoryScope.requireTime = function (layer) {
        if (layer && categoryScope.layersRequireTime.indexOf(layer.Name.split(":")[1]) >= 0) {
            return true;
        } else {
            return false;
        }
    };

    categoryScope.requireExtraFilter = function (layer) {
        if (layer && categoryScope.layersRequireExtraFilter.indexOf(layer.Name.split(":")[1]) >= 0) {
            return true;
        } else {
            return false;
        }
    };

    categoryScope.getAttribute = function (layer) {
        var layerName = layer.Name.split(":")[1];
        if (layerName in categoryScope.attributeMap) {
            return categoryScope.attributeMap[layerName];
        } else {
            return null;
        }
    };

    categoryScope.setConfig = function (layer) {
        layer.config = layer.config || {};

        layer.config.requireTime = categoryScope.requireTime(layer);
        layer.config.requireExtraFilter = categoryScope.requireExtraFilter(layer);
        layer.filters = {};
        layer.filterVals = [];
        layer.query = '';
        layer.config.attribute = categoryScope.getAttribute(layer);
        layer.config.current = null;
    };

    categoryScope.updateFilter = function (layer, filters) {
        _.each(filters, function (filter, key) {
            layer.filters[key] = filter;
        });
    };

    owsLayers.getLayers(keywordPrefix)
        .then(function (layers) {
            _.each(layers, function (l) {
                var layer = _.cloneDeep(l);
                categoryScope.prepAndInitLayers(layer);
            });
        });

    catMgr.addCategory(0, new Category(0, 'GrizzlyBear', 'fa-compass',
        new WidgetDef('st-grizzlybear-geo-category', categoryScope), null, true));
}])

.directive('stGrizzlybearGeoCategory', [
'$log',
function ($log) {
    $log.debug('stealth.grizzlybear.geo.stGrizzlybearGeoCategory: directive defined');
    return {
        restrict: 'AE',
        templateUrl: 'grizzlybear/geo/category.tpl.html',
        link: function (scope, element, attrs) {

            scope.addFilter = function (layer) {
                var filterConfig = {
                    equality: {}
                };
                var attributes,
                    queries;

                if (layer.query.trim().length === 0) {
                    return;
                }

                attributes = layer.config.attribute.split(",");
                queries = layer.query.split(",");

                if (attributes.length !== queries.length) {
                    return;
                }

                if (!_.contains(layer.filterVals, layer.query)) {
                    layer.filterVals.push(layer.query);
                    layer.query = '';
                    //updateFeatures();
                    filterConfig.equality[layer.config.attribute] = {
                        value: layer.filterVals
                    };
                    scope.updateFilter(layer, filterConfig);
                    var x = 1;

                }
            };

            scope.removeFilter = function (layer, fId) {
                var filterConfig = {
                    equality: {}
                };
                layer.filterVals.splice(layer.filterVals.indexOf(fId), 1);
//                updateFeatures();
                filterConfig.equality[layer.config.attribute] = {
                    value: layer.filterVals
                };
                    scope.updateFilter(layer, filterConfig);
                var x = 1;
            };
        }
    };
}])
;
