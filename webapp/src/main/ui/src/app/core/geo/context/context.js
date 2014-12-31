angular.module('stealth.core.geo.context')

.run([
'$rootScope',
'categoryManager',
'stealth.core.geo.ol3.manager.Category',
'stealth.core.utils.WidgetDef',
'wms',
'ol3Map',
'stealth.core.geo.ol3.layers.MapLayer',
'CONFIG',
function ($rootScope, catMgr, Category, WidgetDef, wms, map, MapLayer, CONFIG) {
    var categoryScope = $rootScope.$new();
    categoryScope.workspaces = {};
    categoryScope.toggleLayer = function (layer, workspace) {
        if (layer.categoryViewState.toggledOn) {
            var mapLayer = new MapLayer(layer.Title, new ol.layer.Tile({
                source: new ol.source.TileWMS({
                    url: CONFIG.geoserver.defaultUrl + '/wms',
                    params: {
                        layers: layer.Name
                    }
                })
            }), (workspace.toLowerCase().indexOf('base') === 0 ? -20 : -10));
            layer.mapLayerId = mapLayer.id;
            mapLayer.styleDirectiveScope.styleVars.iconClass = 'fa fa-fw fa-lg fa-compass';
            map.addLayer(mapLayer);
        } else {
            map.removeLayerById(layer.mapLayerId);
            delete layer.mapLayerId;
        }
    };
    wms.getCapabilities(CONFIG.geoserver.defaultUrl, CONFIG.geoserver.omitProxy)
        .then(function (wmsCap) {
            _.each(wmsCap.Capability.Layer.Layer, function (l) {
                _.each(l.KeywordList, function (keyword) {
                    var keywordParts = keyword.split('.');
                    if (keywordParts.length > 2 && keywordParts[0] === CONFIG.app.context &&
                            keywordParts[1] === 'context') {
                        var layer = _.cloneDeep(l);
                        layer.categoryViewState = {
                            toggledOn: false
                        };
                        var workspace = keywordParts[2];
                        if (_.isArray(categoryScope.workspaces[workspace])) {
                            categoryScope.workspaces[workspace].push(layer);
                        } else {
                            categoryScope.workspaces[workspace] = [layer];
                        }
                        //Turn on configured layers
                        if (_.find(CONFIG.map.initLayers, {Name: layer.Name, serverUrl: layer.serverUrl})) {
                            layer.categoryViewState.toggledOn = true;
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
