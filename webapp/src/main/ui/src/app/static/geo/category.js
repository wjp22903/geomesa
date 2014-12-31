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
        new WidgetDef('st-static-geo-category'), null, false));
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
            if (_.isUndefined($scope.workspaces)) {
                $scope.workspaces = {};
                wms.getCapabilities(CONFIG.geoserver.defaultUrl, CONFIG.geoserver.omitProxy)
                    .then(function (wmsCap) {
                        _.each(wmsCap.Capability.Layer.Layer, function (l) {
                            _.each(l.KeywordList, function (keyword) {
                                var keywordParts = keyword.split('.');
                                if (keywordParts.length > 2 && keywordParts[0] === CONFIG.app.context &&
                                        keywordParts[1] === 'static') {
                                    var layer = _.cloneDeep(l);
                                    layer.filterLayers = [{
                                        name: 'All'
                                    }];
                                    var workspace = keywordParts[2];
                                    if (_.isArray($scope.workspaces[workspace])) {
                                        $scope.workspaces[workspace].push(layer);
                                    } else {
                                        $scope.workspaces[workspace] = [layer];
                                    }
                                    return false;
                                }
                            });
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
                    mapLayer.styleDirectiveScope.styleVars.iconClass = 'fa fa-fw fa-lg fa-database';
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
