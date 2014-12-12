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
            map.addLayer(mapLayer);
        } else {
            map.removeLayerById(layer.mapLayerId);
            delete layer.mapLayerId;
        }
    };
    wms.getCapabilities('cors/' + CONFIG.geoserver.defaultUrl + '/wms')
        .then(function (wmsCap) {
            _.each(wmsCap.Capability.Layer.Layer, function (l) {
                var nameParts = l.Name.split(':');
                if (nameParts.length === 2) {
                    var name = nameParts[1];
                    var wsParts = nameParts[0].split('.');
                    if (wsParts.length > 2 && wsParts[0] === CONFIG.app.context &&
                            wsParts[1] === 'context') {
                        var layer = _.cloneDeep(l);
                        layer.categoryViewState = {
                            toggledOn: false
                        };
                        var workspace = wsParts[2];
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
                    }
                }
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
