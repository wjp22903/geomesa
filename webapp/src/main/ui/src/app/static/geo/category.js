angular.module('stealth.static.geo', [
    'colorpicker.module',
    'stealth.static.wizard'
])

.run([
'categoryManager',
'stealth.core.geo.ol3.manager.Category',
'stealth.core.utils.WidgetDef',
function (catMgr, Category, WidgetDef) {
    catMgr.addCategory(0, new Category(1, 'Data', 'fa-database',
        new WidgetDef('st-static-geo-category'), null, true));
}])

.directive('stStaticGeoCategory', [
'$log',
'wms',
'ol3Map',
'stealth.core.geo.ol3.layers.MapLayer',
'staticDataWiz',
'CONFIG',
function ($log, wms, ol3Map, MapLayer, wizard, CONFIG) {
    $log.debug('stealth.static.geo.context.stStaticGeoCategory: directive defined');
    return {
        templateUrl: 'static/geo/category.tpl.html',
        controller: ['$scope', function ($scope) {
            if (_.isEmpty($scope.workspaces)) {
                $scope.workspaces = {};
                wms.getCapabilities('cors/' + CONFIG.geoserver.defaultUrl + '/wms')
                    .then(function (wmsCap) {
                        _.each(wmsCap.Capability.Layer.Layer, function (l) {
                            var nameParts = l.Name.split(':');
                            if (nameParts.length === 2) {
                                var name = nameParts[1];
                                var wsParts = nameParts[0].split('.');
                                if (wsParts.length > 2 && wsParts[0] === CONFIG.app.context &&
                                        wsParts[1] === 'static') {
                                    var layer = _.cloneDeep(l);
                                    layer.filterLayers = [{
                                        name: 'All'
                                    }];
                                    var workspace = wsParts[2];
                                    if (_.isArray($scope.workspaces[workspace])) {
                                        $scope.workspaces[workspace].push(layer);
                                    } else {
                                        $scope.workspaces[workspace] = [layer];
                                    }
                                }
                            }
                        });
                    });
            }
            $scope.toggleLayer = function (layer, filterLayer) {
                if (filterLayer.toggledOn) {
                    var mapLayer = new MapLayer(layer.Title + ' - ' + filterLayer.name, new ol.layer.Tile({
                        source: new ol.source.TileWMS({
                            url: CONFIG.geoserver.defaultUrl + '/wms',
                            params: {
                                LAYERS: layer.Name,
                                CQL_FILTER: filterLayer.cqlFilter,
                                STYLES: filterLayer.style,
                                ENV: filterLayer.env,
                                BUFFER: 6
                            }
                        })
                    }));
                    filterLayer.mapLayerId = mapLayer.id;
                    ol3Map.addLayer(mapLayer);
                } else {
                    ol3Map.removeLayerById(filterLayer.mapLayerId);
                    delete filterLayer.mapLayerId;
                }
            };
            $scope.launchLayerFilterWizard = function (layer) {
                wizard.launch(layer);
            };
            $scope.removeLayer = function (layer, filterLayer) {
                ol3Map.removeLayerById(filterLayer.mapLayerId);
                delete filterLayer.mapLayerId;
                _.pull(layer.filterLayers, filterLayer);
            };
        }]
    };
}])
;
