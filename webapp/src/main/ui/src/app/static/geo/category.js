angular.module('stealth.static.geo', [
    'colorpicker.module',
    'stealth.static.wizard'
])

.service('staticWorkspaceManager', [
'$timeout',
'owsLayers',
'colors',
'ol3Map',
'stealth.core.geo.ol3.layers.WmsLayer',
'CONFIG',
function ($timeout, owsLayers, colors, ol3Map, WmsLayer, CONFIG) {
    var _self = this;
    var iconImgSrc = '';
    var markerStyles = ['point', 'heatmap'];
    var stealthMarkerStyles = {
        'point': 'stealth_dataPoints',
        'heatmap': 'stealth_heatmap'
    };
    var markerShapes = ['circle', 'square', 'triangle', 'star', 'cross', 'x'];
    var counter = 0;

    var getShape = function () {
        var shape = markerShapes[counter++ % 6];
        if (counter % 6 === 0) {
            counter = 0;
        }
        return shape;
    };
    var updateIconImgSrc = function (filterLayer) {
        var url = filterLayer.wmsUrl || CONFIG.geoserver.defaultUrl + '/wms';
        iconImgSrc = url +
                     "?REQUEST=GetLegendGraphic&FORMAT=image/png&WIDTH=16&HEIGHT=16&TRANSPARENT=true&LAYER=" +
                     filterLayer.layerName +
                     "&ENV=" + getRequestEnv(filterLayer.viewState.fillColor,
                                             filterLayer.viewState.size,
                                             filterLayer.viewState.markerShape,
                                             filterLayer.viewState.radiusPixels);
        if (!_.isUndefined(filterLayer.style)) {
            iconImgSrc += "&STYLE=" + filterLayer.style;
        }
    };
    var getRequestEnv = function (fillColor, size, shape, radiusPixels) {
        var env = 'color:' + fillColor.slice(1) +
                  ';size:' + size +
                  ';shape:' + shape;
        if (_.isNumber(radiusPixels)) {
            env += ';radiusPixels:' + radiusPixels;
        }
        return env;
    };

    this.workspaces = {};

    this.getIconImgSrc = function (filterLayer) {
        updateIconImgSrc(filterLayer);
        return iconImgSrc;
    };
    this.findLayer = function (workspaceName, layerName) {
        if (_.has(_self.workspaces, workspaceName)) {
            return _.find(_self.workspaces[workspaceName], {Name: layerName});
        }
        return undefined;
    };
    this.toggleLayer = function (layer, filterLayer) {
        if (_.isUndefined(filterLayer.mapLayerId) || _.isNull(filterLayer.mapLayerId)) {

            var requestParams = {
                LAYERS: filterLayer.layerName,
                CQL_FILTER: filterLayer.cqlFilter,
                STYLES: filterLayer.style,
                ENV: filterLayer.env,
                unique: _.now()
            };
            updateIconImgSrc(filterLayer);

            var mapLayer = new WmsLayer({
                name: filterLayer.title + ' - ' + (filterLayer.layerTitle || filterLayer.layerName),
                requestParams: requestParams,
                queryable: true,
                layerThisBelongsTo: layer
            });

            var updateRequestParams = function (filterLayer) {
                var markerStyle = filterLayer.viewState.markerStyle;
                filterLayer.style = stealthMarkerStyles[markerStyle];
                requestParams.STYLES = filterLayer.style;
                requestParams.ENV = getRequestEnv(filterLayer.viewState.fillColor,
                                                  filterLayer.viewState.size,
                                                  filterLayer.viewState.markerShape,
                                                  filterLayer.viewState.radiusPixels);
                mapLayer.updateRequestParams(requestParams);
            };

            updateRequestParams(filterLayer);

            var ol3Layer = mapLayer.getOl3Layer();
            filterLayer.mapLayerId = mapLayer.id;
            filterLayer.viewState.isOnMap = true;
            filterLayer.viewState.toggledOn = ol3Layer.getVisible();
            mapLayer.styleDirectiveScope.styleVars.iconClass = 'fa fa-fw fa-lg fa-database';
            mapLayer.styleDirective = 'st-static-style-view';
            mapLayer.styleDirectiveScope.filterLayer = filterLayer;
            mapLayer.styleDirectiveScope.getIconImgSrc = _self.getIconImgSrc;
            mapLayer.styleDirectiveScope.markerStyles = markerStyles;
            mapLayer.styleDirectiveScope.markerShapes = markerShapes;
            ol3Map.addLayer(mapLayer);

            mapLayer.styleDirectiveScope.setFillColor = function (filterLayer) {
                updateIconImgSrc(filterLayer);
                updateRequestParams(filterLayer);
            };

            mapLayer.styleDirectiveScope.sizeChanged = function (filterLayer, size) {
                if (!angular.isNumber(filterLayer.viewState.size)) {
                    size = 1;
                    filterLayer.viewState.size = 1;
                }
                updateIconImgSrc(filterLayer);
                updateRequestParams(filterLayer);
            };

            mapLayer.styleDirectiveScope.markerStyleChanged = function (filterLayer) {
                updateIconImgSrc(filterLayer);
                updateRequestParams(filterLayer);
            };

            mapLayer.styleDirectiveScope.markerShapeChanged = function (filterLayer) {
                updateIconImgSrc(filterLayer);
                updateRequestParams(filterLayer);
            };

            mapLayer.styleDirectiveScope.heatmapRadiusChanged = function (filterLayer, radius) {
                if (!angular.isNumber(filterLayer.viewState.radiusPixels)) {
                    radius = 10;
                    filterLayer.viewState.radiusPixels = 10;
                }
                updateRequestParams(filterLayer);
            };

            // Update viewState on layer visibility change.
            ol3Layer.on('change:visible', function () {
                $timeout(function () {
                    filterLayer.viewState.toggledOn = ol3Layer.getVisible();
                });
            });

            mapLayer.styleDirectiveScope.$on(mapLayer.id + ':isLoading', function (e) {
                filterLayer.viewState.isLoading = true;
                e.stopPropagation();
            });

            mapLayer.styleDirectiveScope.$on(mapLayer.id + ':finishedLoading', function (e) {
                filterLayer.viewState.isLoading = false;
                e.stopPropagation();
            });
        } else {
            var l = ol3Map.getLayerById(filterLayer.mapLayerId);
            delete l.styleDirectiveScope.layer;
            ol3Map.removeLayerById(filterLayer.mapLayerId);
            delete filterLayer.mapLayerId;
            filterLayer.viewState.isOnMap = false;
            filterLayer.viewState.toggledOn = false;
            filterLayer.env = getRequestEnv(filterLayer.viewState.fillColor,
                                            filterLayer.viewState.size,
                                            filterLayer.viewState.markerShape,
                                            filterLayer.viewState.radiusPixels);
        }
    };

    var keywordPrefix = 'static';
    owsLayers.getLayers(keywordPrefix)
        .then(function (layers) {
            _.each(layers, function (l) {
                var layer = _.cloneDeep(l);
                layer.filterLayers = [];
                _.each(_.get(layer.KeywordConfig, keywordPrefix), function (conf, workspace) {
                    if (_.isArray(_self.workspaces[workspace])) {
                        _self.workspaces[workspace].push(layer);
                    } else {
                        _self.workspaces[workspace] = [layer];
                    }
                });
            });
        });
}])

.run([
'$rootScope',
'staticWorkspaceManager',
'categoryManager',
'staticLayerWizard',
'ol3Map',
'stealth.core.geo.ol3.manager.Category',
'stealth.core.utils.WidgetDef',
'CONFIG',
function ($rootScope, staticWorkspaceMgr, catMgr, wizard, ol3Map,
          Category, WidgetDef, CONFIG) {
    var catScope = $rootScope.$new();
    catScope.workspaces = staticWorkspaceMgr.workspaces;
    catScope.getIconImgSrc = staticWorkspaceMgr.getIconImgSrc;
    catScope.toggleLayer = staticWorkspaceMgr.toggleLayer;

    catScope.toggleVisibility = function (layer) {
        var mapLayer = ol3Map.getLayerById(layer.mapLayerId);
        var ol3Layer = mapLayer.getOl3Layer();
        ol3Layer.setVisible(!ol3Layer.getVisible());
    };

    catScope.removeLayer = function (layer, filterLayer) {
        if (filterLayer.viewState.isOnMap) {
            catScope.toggleLayer(layer, filterLayer);
        }
        _.pull(layer.filterLayers, filterLayer);
    };

    catScope.launchLayerFilterWizard = function (layer) {
        wizard.launch(layer, catScope.toggleLayer);
    };

    var widgetDef = new WidgetDef('st-static-geo-category', catScope);
    var category = new Category(1, _.get(CONFIG, 'static.categoryName') || 'Data', 'fa-database', widgetDef, null, true);
    category.height = 500; // Expand to this (max) height before scrolling.
    catMgr.addCategory(0, category);
}])

.directive('stStaticGeoCategory', [
'$log',
function ($log) {
    $log.debug('stealth.static.geo.context.stStaticGeoCategory: directive defined');
    return {
        templateUrl: 'static/geo/category.tpl.html'
    };
}])

.directive('stStaticStyleView', [
'$log',
function ($log) {
    var tag = 'stealth.static.geo.stStaticStyleView: ';
    $log.debug(tag + 'directive defined');
    return {
        templateUrl: 'static/geo/staticstyleview.tpl.html'
    };
}])
;
