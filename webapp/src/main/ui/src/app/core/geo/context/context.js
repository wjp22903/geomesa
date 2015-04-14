angular.module('stealth.core.geo.context', [
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
'stealth.core.geo.ol3.layers.WmsLayer',
'CONFIG',
function ($rootScope, $timeout, catMgr, Category, WidgetDef, owsLayers, ol3Map,
          WmsLayer, CONFIG) {
    var categoryScope = $rootScope.$new();
    categoryScope.workspaces = {};

    categoryScope.toggleLayer = function (layer, workspace) {
        if (_.isUndefined(layer.mapLayerId) || _.isNull(layer.mapLayerId)) {
            var requestParams = {
                LAYERS: layer.Name
            };
            var wmsLayer = new WmsLayer(layer.Title,
                                        requestParams,
                                        layer.queryable,
                                        layer.viewState.lastOpacity,
                                        (workspace.toLowerCase().indexOf('base') === 0 ? -20 : -10),
                                        layer.serverUrl);
            wmsLayer.applyCql(layer.cqlFilter);
            var ol3Layer = wmsLayer.getOl3Layer();
            layer.mapLayerId = wmsLayer.id;
            layer.viewState.isOnMap = true;
            layer.viewState.toggledOn = ol3Layer.getVisible();
            wmsLayer.styleDirectiveScope.styleVars.iconClass = 'fa fa-fw fa-lg fa-compass';
            ol3Map.addLayer(wmsLayer);

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

    var keywordPrefix = 'context';
    owsLayers.getLayers(keywordPrefix)
        .then(function (layers) {
            _.each(layers, function (l) {
                var layer = _.cloneDeep(l);
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
                _.each(_.deepGet(layer.KeywordConfig, keywordPrefix), function (conf, workspace) {
                    if (_.isArray(categoryScope.workspaces[workspace])) {
                        categoryScope.workspaces[workspace].push(layer);
                    } else {
                        categoryScope.workspaces[workspace] = [layer];
                    }
                    //Turn on configured layers
                    var initLayer = _.find(CONFIG.map.initLayers, {Name: layer.Name, serverUrl: layer.serverUrl});
                    if (initLayer) {
                        layer.viewState.isOnMap = true;
                        layer.viewState.toggledOn = true;
                        layer.viewState.lastOpacity = initLayer.opacity || layer.viewState.lastOpacity;
                        categoryScope.toggleLayer(layer, workspace);
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
