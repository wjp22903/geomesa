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
'stealth.core.geo.ol3.layers.XYZLayer',
'CONFIG',
function ($rootScope, $timeout, catMgr, Category, WidgetDef, owsLayers, ol3Map,
          WmsLayer, XYZLayer, CONFIG) {
    var categoryScope = $rootScope.$new();
    categoryScope.workspaces = {};

    categoryScope.toggleLayer = function (layer, workspace) {
        if (_.isUndefined(layer.mapLayerId) || _.isNull(layer.mapLayerId)) {
            var ol3Layer;
            var portableLayer;
            if (layer.xyz) {
                portableLayer = new XYZLayer({
                    name: layer.Title,
                    opacity: layer.viewState.lastOpacity,
                    zIndexHint: (workspace.toLowerCase().indexOf('base') === 0 ? -20 : -10),
                    serverUrl: layer.serverUrl,
                    originalProjection: layer.originalProjection,
                    tileSize: layer.tileSize,
                    wrapX: layer.wrapX,
                    minZoom: layer.minZoom,
                    maxZoom: layer.maxZoom
                });
            } else {
                var requestParams = {
                    LAYERS: layer.Name
                };
                portableLayer = new WmsLayer({
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
            }

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

    var keywordPrefix = 'context';
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

    owsLayers.getLayers(keywordPrefix)
        .then(function (layers) {
            _.each(layers, function (l) {
                var layer = _.cloneDeep(l);
                categoryScope.prepAndInitLayers(layer);
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
