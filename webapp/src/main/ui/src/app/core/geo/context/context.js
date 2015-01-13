angular.module('stealth.core.geo.context')

.run([
'$log',
'$rootScope',
'$timeout',
'categoryManager',
'stealth.core.geo.ol3.manager.Category',
'stealth.core.utils.WidgetDef',
'wms',
'ol3Map',
'stealth.core.geo.ol3.layers.WmsLayer',
'CONFIG',
function ($log, $rootScope, $timeout, catMgr, Category, WidgetDef, wms, ol3Map, WmsLayer, CONFIG) {
    var tag = 'stealth.core.geo.context: ';
    var categoryScope = $rootScope.$new();
    categoryScope.workspaces = {};

    categoryScope.toggleLayer = function (layer, workspace) {
        if (_.isUndefined(layer.mapLayerId) || _.isNull(layer.mapLayerId)) {
            var requestParams = {
                LAYERS: layer.Name
            };
            var preload = Infinity;
            var wmsLayer = new WmsLayer(layer.Title,
                                        requestParams,
                                        preload,
                                        (workspace.toLowerCase().indexOf('base') === 0 ? -20 : -10));
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

            wmsLayer.styleDirectiveScope.$on(wmsLayer.id + ':isLoading', function (e, tilesCnt) {
                layer.viewState.isLoading = true;
                layer.viewState.numLoaded = tilesCnt.total - tilesCnt.loading;
                layer.viewState.numTiles = tilesCnt.total;
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
        }
    };

    categoryScope.toggleVisibility = function (layer) {
        var mapLayer = ol3Map.getLayerById(layer.mapLayerId);
        var ol3Layer = mapLayer.getOl3Layer();
        ol3Layer.setVisible(!ol3Layer.getVisible());
    };

    wms.getCapabilities(CONFIG.geoserver.defaultUrl, CONFIG.geoserver.omitProxy)
        .then(function (wmsCap) {
            _.each(wmsCap.Capability.Layer.Layer, function (l) {
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
