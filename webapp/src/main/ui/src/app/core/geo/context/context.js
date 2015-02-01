angular.module('stealth.core.geo.context', [
    'stealth.core.utils'
])

.run([
'$log',
'$rootScope',
'$timeout',
'$http',
'$filter',
'$q',
'categoryManager',
'stealth.core.geo.ol3.manager.Category',
'stealth.core.utils.WidgetDef',
'wms',
'ol3Map',
'stealth.core.geo.ol3.layers.WmsLayer',
'mapClickService',
'CONFIG',
function ($log, $rootScope, $timeout, $http, $filter, $q,
          catMgr, Category, WidgetDef, wms, ol3Map, WmsLayer, mapClickService, CONFIG) {
    var tag = 'stealth.core.geo.context: ';
    var categoryScope = $rootScope.$new();
    categoryScope.workspaces = {};

    categoryScope.toggleLayer = function (layer, workspace) {
        if (_.isUndefined(layer.mapLayerId) || _.isNull(layer.mapLayerId)) {
            var requestParams = {
                LAYERS: layer.Name
            };
            var wmsLayer = new WmsLayer(layer.Title,
                                        requestParams,
                                        (workspace.toLowerCase().indexOf('base') === 0 ? -20 : -10),
                                        layer.serverUrl);
            wmsLayer.applyCql(layer.cqlFilter);
            var ol3Layer = wmsLayer.getOl3Layer();
            layer.mapLayerId = wmsLayer.id;
            layer.viewState.isOnMap = true;
            layer.viewState.toggledOn = ol3Layer.getVisible();
            wmsLayer.styleDirectiveScope.styleVars.iconClass = 'fa fa-fw fa-lg fa-compass';
            ol3Map.addLayer(wmsLayer);
            if (layer.queryable) {
                layer.searchId = mapClickService.registerSearchable(function (coord, res) {
                    if (wmsLayer.getOl3Layer().getVisible()) {
                        var url = wmsLayer.getOl3Layer().getSource().getGetFeatureInfoUrl(
                            coord, res, CONFIG.map.projection, {
                                INFO_FORMAT: 'application/json',
                                FEATURE_COUNT: 999999
                            }
                        );
                        return $http.get($filter('cors')(url, null, CONFIG.geoserver.omitProxy))
                            .then(function (response) {
                                return {
                                    name: layer.Title,
                                    records: _.pluck(response.data.features, 'properties'),
                                    layerFill: {
                                        display: 'none'
                                    }
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
            }

            // Update viewState on layer visibility change.
            ol3Layer.on('change:visible', function () {
                $timeout(function () {
                    layer.viewState.toggledOn = ol3Layer.getVisible();
                });
            });

            wmsLayer.styleDirectiveScope.$on(wmsLayer.id + ':isLoading', function (e) {
                layer.viewState.isLoading = true;
                e.stopPropagation();
            });

            wmsLayer.styleDirectiveScope.$on(wmsLayer.id + ':finishedLoading', function (e) {
                layer.viewState.isLoading = false;
                e.stopPropagation();
            });
        } else {
            ol3Map.removeLayerById(layer.mapLayerId);
            delete layer.mapLayerId;
            layer.viewState.isOnMap = false;
            layer.viewState.toggledOn = false;
            if (_.isNumber(layer.searchId)) {
                mapClickService.unregisterSearchableById(layer.searchId);
                delete layer.searchId;
            }
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

    wms.getCapabilities(CONFIG.geoserver.defaultUrl, CONFIG.geoserver.omitProxy)
    .then(function (wmsCap) {
        $log.debug(tag + 'GetCapabilities request has returned');

        var layers = wmsCap.Capability.Layer.Layer;
        _.each(CONFIG.map.extraLayers, function (layer) {
            layers.push(layer);
        });

        _.each(layers, function (l) {
            _.each(l.KeywordList, function (keyword) {
                var keywordParts = keyword.split('.');
                if (keywordParts.length > 2 && keywordParts[0] === CONFIG.app.context &&
                        keywordParts[1] === 'context') {
                    var layer = _.cloneDeep(l);
                    layer.viewState = {
                        isOnMap: false,
                        toggledOn: false,
                        isLoading: false
                    };
                    layer.getTooltip = function () {
                        if (layer.viewState.isOnMap) {
                            return 'Remove from map';
                        }
                        return 'Add to map';
                    };
                    var workspace = keywordParts[2];
                    if (_.isArray(categoryScope.workspaces[workspace])) {
                        categoryScope.workspaces[workspace].push(layer);
                    } else {
                        categoryScope.workspaces[workspace] = [layer];
                    }
                    //Turn on configured layers
                    if (_.find(CONFIG.map.initLayers, {Name: layer.Name, serverUrl: layer.serverUrl})) {
                        layer.viewState.isOnMap = true;
                        layer.viewState.toggledOn = true;
                        categoryScope.toggleLayer(layer, workspace);
                    }
                    return false;
                }
            });
        });
    });

    catMgr.addCategory(0, new Category(0, 'Context', 'fa-compass',
        new WidgetDef('st-context-geo-category', categoryScope), null, true));
}])

.directive('stContextGeoCategory', [
'$log',
function ($log) {
    $log.debug('stealth.core.geo.context.stContextGeoCategory: directive defined');
    return {
        templateUrl: 'core/geo/context/category.tpl.html'
    };
}])
;
