angular.module('stealth.static.geo', [
    'colorpicker.module',
    'stealth.core.geo.ows',
    'stealth.static.wizard'
])

.run([
'$rootScope',
'staticWorkspaceManager',
function ($rootScope, staticWorkspaceManager) {
    $rootScope.$on('owsLayers:update', function (evt, req) { // eslint-disable-line no-unused-vars
        if (_.contains(req.keywordPrefixes, 'static')) {
            staticWorkspaceManager.refreshLayers();
        }
    });
}])

.service('staticWorkspaceManager', [
'$timeout',
'owsLayers',
'ol3Map',
'stealth.core.geo.ol3.layers.WmsLayer',
'CONFIG',
function ($timeout, owsLayers, ol3Map, WmsLayer, CONFIG) {
    var _self = this;
    var iconImgSrc = '';

    var baseStyles = {
        'point': 'stealth_dataPoints',
        'attribute': 'stealth_attribute',
        'heatmap': 'stealth_heatmap'
    };

    this.markerShapes = ['circle', 'square', 'triangle', 'star', 'cross', 'x'];
    this.colorRamps = ['green', 'blue', 'orange', 'purple', 'red'];

    var updateIconImgSrc = function (filterLayer) {
        var url = filterLayer.wmsUrl || CONFIG.geoserver.defaultUrl + '/wms';
        iconImgSrc = url +
                     "?REQUEST=GetLegendGraphic&FORMAT=image/png&WIDTH=16&HEIGHT=16&TRANSPARENT=true&LAYER=" +
                     filterLayer.layerName +
                     "&ENV=" + _self.getRequestEnv(filterLayer.viewState.fillColor,
                                                   filterLayer.viewState.size,
                                                   filterLayer.viewState.markerShape,
                                                   filterLayer.viewState.radiusPixels,
                                                   filterLayer.viewState.colorRamp,
                                                   filterLayer.viewState.geom,
                                                   filterLayer.viewState.hashAttr);
        if (!_.isUndefined(filterLayer.style)) {
            iconImgSrc += "&STYLE=" + filterLayer.style;
        }
    };

    this.getRequestEnv = function (fillColor, size, shape, radiusPixels, colorRamp, geom, hashAttr) {
        var env = 'color:' + fillColor.slice(1) +
                  ';size:' + size +
                  ';shape:' + shape +
                  ';colorRamp:' + colorRamp +
                  ';geom:' + geom;
        if (_.isNumber(radiusPixels)) {
            env += ';radiusPixels:' + radiusPixels;
        }
        if (hashAttr && hashAttr.name) {
            env += ';hashAttr:' + hashAttr.name;
        }
        return env;
    };

    this.getLayerStyles = function (layer) {
        var configuredStyles = _.object(_.map(layer.Style, function (s) {
            return [s.Title, s.Name];
        }));
        return _.merge(_.clone(baseStyles), configuredStyles);
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
            var allStyles = _self.getLayerStyles(layer);
            var markerStyles = _.keys(allStyles);

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
                filterLayer.style = allStyles[markerStyle];
                requestParams.STYLES = filterLayer.style;
                requestParams.ENV = _self.getRequestEnv(filterLayer.viewState.fillColor,
                                                        filterLayer.viewState.size,
                                                        filterLayer.viewState.markerShape,
                                                        filterLayer.viewState.radiusPixels,
                                                        filterLayer.viewState.colorRamp,
                                                        filterLayer.viewState.geom,
                                                        filterLayer.viewState.hashAttr);
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
            mapLayer.styleDirectiveScope.markerShapes = _self.markerShapes;
            mapLayer.styleDirectiveScope.colorRamps = _self.colorRamps;
            mapLayer.styleDirectiveScope.featureAttributes = filterLayer.query.featureTypeData.featureTypes[0].properties;
            ol3Map.addLayer(mapLayer);

            mapLayer.styleDirectiveScope.setFillColor = function (filterLayer) {
                updateIconImgSrc(filterLayer);
                updateRequestParams(filterLayer);
            };

            mapLayer.styleDirectiveScope.sizeChanged = function (filterLayer) {
                if (!angular.isNumber(filterLayer.viewState.size)) {
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

            mapLayer.styleDirectiveScope.heatmapRadiusChanged = function (filterLayer) {
                if (!angular.isNumber(filterLayer.viewState.radiusPixels)) {
                    filterLayer.viewState.radiusPixels = 10;
                }
                updateRequestParams(filterLayer);
            };

            mapLayer.styleDirectiveScope.colorRampChanged = function (filterLayer) {
                updateIconImgSrc(filterLayer);
                updateRequestParams(filterLayer);
            };

            mapLayer.styleDirectiveScope.hashAttrChanged = function (filterLayer) {
                updateIconImgSrc(filterLayer);
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
            filterLayer.env = _self.getRequestEnv(filterLayer.viewState.fillColor,
                                            filterLayer.viewState.size,
                                            filterLayer.viewState.markerShape,
                                            filterLayer.viewState.radiusPixels,
                                            filterLayer.viewState.colorRamp,
                                            filterLayer.viewState.geom);
        }
    };

    var keywordPrefix = 'static';

    /**
     * When we want to refreshLayers, we should keep track of all layers at the time we called refresh, in case any
     * of those layers are still showing on the map. Also, we can't assume that refreshing will only be called when
     * new layers are present, and must account for the fact that layers may have been deleted. Finally, overwriting
     * the workspaces object seems to break the binding to catScope.workspace below, so we do everything in place.
     */
    var markLayersForDeletion = function () {
        _.each(_self.workspaces, function (workspace) {
            _.each(workspace, function (layer) {
                layer.DELETABLE = true;
            });
        });
    };
    var removeDeletionMarker = function (layer) {
        delete layer.DELETABLE;
    };
    var removeDeletableLayers = function () {
        var emptyWorkspaces = [];
        _.each(_.keys(_self.workspaces), function (workspaceName) {
            var ws = _.reject(_self.workspaces[workspaceName], 'DELETABLE');
            _.each(_.filter(_self.workspaces[workspaceName], 'DELETABLE'), function (layer) {
                _.each(layer.filterLayers, function (filterLayer) {
                    _self.toggleLayer(layer, filterLayer);
                });
            });
            _.each(ws, function (layer) {
                removeDeletionMarker(layer);
            });
            _self.workspaces[workspaceName] = ws;
            if (ws.length === 0) {
                emptyWorkspaces.push(workspaceName);
            }
        });
        _.each(emptyWorkspaces, function (workspaceName) {
            delete _self.workspaces[workspaceName];
        });
    };
    this.refreshLayers = function (skipRefresh) {
        owsLayers.getLayers(keywordPrefix, !skipRefresh)
            .then(function (layers) {
                markLayersForDeletion(); // assume everything can be deleted
                _.each(layers, function (l) {
                    var layer = _.cloneDeep(l);
                    layer.filterLayers = [];
                    _.each(_.keys(_.get(layer.KeywordConfig, keywordPrefix)), function (workspace) {
                        if (!_.isArray(_self.workspaces[workspace])) {
                            _self.workspaces[workspace] = [];
                        }
                        var priorLayer = _.find(_self.workspaces[workspace], {Name: layer.Name});
                        if (!priorLayer) {
                            _self.workspaces[workspace].push(layer);
                        } else {
                            removeDeletionMarker(priorLayer);
                        }
                    });
                });
                // anything that still has a deletion flag actually can be removed
                removeDeletableLayers();
            });
    };
    this.refreshLayers(true);
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
