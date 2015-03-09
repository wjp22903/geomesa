angular.module('stealth.static.geo', [
    'colorpicker.module',
    'stealth.static.wizard'
])

.run([
'$log',
'$rootScope',
'$timeout',
'$http',
'$filter',
'$q',
'categoryManager',
'staticLayerWizard',
'wms',
'ol3Map',
'colors',
'stealth.core.geo.ol3.manager.Category',
'stealth.core.utils.WidgetDef',
'stealth.core.geo.ol3.layers.WmsLayer',
'mapClickSearchService',
'CONFIG',
function ($log, $rootScope, $timeout, $http, $filter, $q,
          catMgr, wizard, wms, ol3Map, colors,
          Category, WidgetDef, WmsLayer, mapClickSearchService, CONFIG) {
    var tag = 'stealth.static.geo: ';
    var catScope = $rootScope.$new();
    catScope.workspaces = {};

    function getRequestEnv (fillColor, size, shape, radiusPixels) {
        var env = 'color:' + fillColor.slice(1) +
                  ';size:' + size +
                  ';shape:' + shape;
        if (_.isNumber(radiusPixels)) {
            env += ';radiusPixels:' + radiusPixels;
        }
        return env;
    }

    var iconImgSrc = '';
    function updateIconImgSrc (filterLayer) {
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
    }
    var getIconImgSrc = function (filterLayer) {
        updateIconImgSrc(filterLayer);
        return iconImgSrc;
    };

    catScope.getIconImgSrc = getIconImgSrc;

    var markerStyles = ['point', 'heatmap'];
    var stealthMarkerStyles = {
        'point': 'stealth_dataPoints',
        'heatmap': 'stealth_heatmap'
    };
    var markerShapes = ['circle', 'square', 'triangle', 'star', 'cross', 'x'];
    catScope.toggleLayer = function (layer, filterLayer) {
        if (_.isUndefined(filterLayer.mapLayerId) || _.isNull(filterLayer.mapLayerId)) {

            var requestParams = {
                LAYERS: filterLayer.layerName,
                CQL_FILTER: filterLayer.cqlFilter,
                STYLES: filterLayer.style,
                ENV: filterLayer.env,
                unique: _.now()
            };
            updateIconImgSrc(filterLayer);

            var mapLayer = new WmsLayer(filterLayer.title + ' - ' +
                                        (filterLayer.layerTitle || filterLayer.layerName),
                                        requestParams);

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
            mapLayer.styleDirectiveScope.getIconImgSrc = getIconImgSrc;
            mapLayer.styleDirectiveScope.markerStyles = markerStyles;
            mapLayer.styleDirectiveScope.markerShapes = markerShapes;
            ol3Map.addLayer(mapLayer);
            filterLayer.searchId = mapClickSearchService.registerSearchable(function (coord, res) {
                if (mapLayer.getOl3Layer().getVisible() &&
                    filterLayer.viewState.markerStyle === 'point') {
                    var url = mapLayer.getOl3Layer().getSource().getGetFeatureInfoUrl(
                        coord, res, CONFIG.map.projection, {
                            INFO_FORMAT: 'application/json',
                            FEATURE_COUNT: 999999
                        }
                    );
                    return $http.get($filter('cors')(url, null, CONFIG.geoserver.omitProxy))
                        .then(function (response) {
                            return {
                                name: mapLayer.name,
                                records: _.pluck(response.data.features, 'properties'),
                                layerFill: {
                                    display: 'none'
                                }
                            };
                        }, function (response) {
                            return {
                                name: mapLayer.name,
                                records: [],
                                isError: true,
                                reason: 'Server error'
                            };
                        });
                } else {
                    return $q.when({name: mapLayer.name, records:[]}); //empty results
                }
            });

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
            if (_.isNumber(filterLayer.searchId)) {
                mapClickSearchService.unregisterSearchableById(filterLayer.searchId);
                delete filterLayer.searchId;
            }
        }
    };

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

    var counter = 0;
    function getShape () {
        var shape = markerShapes[counter++ % 6];
        if (counter % 6 === 0) {
            counter = 0;
        }
        return shape;
    }

    wms.getCapabilities(CONFIG.geoserver.defaultUrl, CONFIG.geoserver.omitProxy)
    .then(function (wmsCap) {
        _.each(wmsCap.Capability.Layer.Layer, function (l) {
            _.each(l.KeywordList, function (keyword) {
                var keywordParts = keyword.split('.');
                if (keywordParts.length > 2 &&
                    keywordParts[0] === CONFIG.app.context &&
                    keywordParts[1] === 'static') {

                    var layer = _.cloneDeep(l);
                    layer.filterLayers = [];
                    var filterLayer = {
                        title: 'All',
                        layerName: layer.Name,
                        layerTitle: layer.Title,
                        wmsUrl: layer.wmsUrl,
                        queryable: layer.queryable,
                        viewState: {
                            isOnMap: false,
                            toggledOn: false,
                            isLoading: false,
                            isRemovable: false,
                            markerStyle: 'point',
                            markerShape: getShape(),
                            size: 9,
                            fillColor: colors.getColor(),
                            radiusPixels: 10
                        }
                    };
                    filterLayer.env = getRequestEnv(filterLayer.viewState.fillColor,
                                                    filterLayer.viewState.size,
                                                    filterLayer.viewState.markerShape,
                                                    filterLayer.viewState.radiusPixels);
                    filterLayer.style = stealthMarkerStyles[filterLayer.viewState.markerStyle];
                    updateIconImgSrc(filterLayer);
                    layer.filterLayers.push(filterLayer);

                    var workspace = keywordParts[2];
                    if (_.isArray(catScope.workspaces[workspace])) {
                        catScope.workspaces[workspace].push(layer);
                    } else {
                        catScope.workspaces[workspace] = [layer];
                    }
                    return false;
                }
            });
        });
    });

    var widgetDef = new WidgetDef('st-static-geo-category', catScope);
    var category = new Category(1, 'Data', 'fa-database', widgetDef, null, true);
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
