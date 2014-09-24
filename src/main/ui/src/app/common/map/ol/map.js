angular.module('stealth.common.map.ol.map', [
    'stealth.ows.ows'
])

    .directive(
    'openlayersMap', ['$rootScope', '$timeout', '$filter', 'CONFIG',
    function ($rootScope, $timeout, $filter, CONFIG) {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                map: '='
            },
            transclude: true,
            template: '<div class="anchorTop anchorBottom anchorLeft anchorRight map">' +
                          '<div class="mapSpinner" ng-show="loading.count > 0">' +
                              '<div class="fa-stack fa-lg">' +
                                  '<i class="fa fa-spinner fa-stack-2x fa-spin"></i>' +
                                  '<span class="fa fa-stack-text fa-stack-1x">{{loading.count}}</span>' +
                              '</div>' +
                          '</div>' +
                          '<div ng-transclude></div>' +
                      '</div>',
            link: function (scope, element, attrs) {
                scope.map.render(attrs.id);
            },
            controller: function ($scope) {
                var self = this;
                var scope = $scope;
                var restrictedExtent = _.isEmpty(CONFIG.map.restrictedExtent) ? new OpenLayers.Bounds(-360, -90, 360, 90) : OpenLayers.Bounds.fromString(CONFIG.map.restrictedExtent),
                    maxExtent = _.isEmpty(CONFIG.map.maxExtent) ? new OpenLayers.Bounds(-360, -90, 360, 90) : OpenLayers.Bounds.fromString(CONFIG.map.maxExtent);
                scope.loading = {
                    count: 0
                };
                scope.state = {
                    zoomedToDataLayer: false
                };

                scope.map = new OpenLayers.Map(_.merge(_.isEmpty(CONFIG.map.maxExtent) ? {} : {maxExtent: maxExtent}, {
                    numZoomLevels: 24,
                    controls: [
                        new OpenLayers.Control.Panel({
                            designation: 'toolbar'
                        }),
                        new OpenLayers.Control.Navigation(),
                        new OpenLayers.Control.Zoom(),
                        new OpenLayers.Control.MousePosition({
                            emptyString: '',
                            formatOutput: function (lonLat) {
                                var digits = parseInt(this.numDigits);
                                var newHtml =
                                    '<table><tr><td>Lat/Lon:&nbsp;&nbsp;</td><td>' +
                                    lonLat.lat.toFixed(digits) + '</td><td>' + lonLat.lon.toFixed(digits) +
                                    '</td></tr><tr><td>DMS:</td><td style="width:85px;">' +
                                    OpenLayers.Util.getFormattedLonLat(lonLat.lat, 'lat', 'dms') +
                                    '</td><td style="width:95px;">' +
                                    OpenLayers.Util.getFormattedLonLat(lonLat.lon, 'lon', 'dms') +
                                    '</td></tr></table>';
                                return newHtml;
                            }
                        }),
                        new OpenLayers.Control.ScaleLine()
                    ],
                    projection: 'EPSG:4326',
                    restrictedExtent: restrictedExtent
                }));

                this.getMap = function () {
                    return scope.map;
                };
                this.addLayer = function (layer, extent, loadStartCallback, loadEndCallback, layerAddedCallback) {
                    layer.events.register('loadstart', null, function (event) {
                        $timeout(function () {
                            scope.loading.count++;
                            if (_.isFunction(loadStartCallback)) {
                                loadStartCallback();
                            }
                        });
                    });
                    layer.events.register('loadend', null, function (event) {
                        $timeout(function () {
                            scope.loading.count--;
                            if (_.isFunction(loadEndCallback)) {
                                loadEndCallback();
                            }
                        });
                    });
                    if (extent) {
                        if (scope.state.zoomedToDataLayer) {
                            var currentExtent = scope.map.getExtent();
                            currentExtent.extend(extent);
                            scope.map.zoomToExtent(currentExtent);
                        } else {
                            scope.map.zoomToExtent(extent);
                            scope.state.zoomedToDataLayer = true;
                        }
                    }
                    scope.map.addLayer(layer);
                    if (_.isFunction(layerAddedCallback)) {
                        layerAddedCallback(scope.map, layer);
                    }
                    return layer;
                };
                this.addWmsLayer = function (layerConfig) {
                    var layer,
                        config = _.merge({
                            // Geomesa layers currently perform better without tiling.
                            // Difficult to distinguish Geomesa requests from other requests.
                            // So singleTile everything.
                            singleTile: true,
                            format: 'image/png',
                            buffer: 6, //reduce tiling effects
                            time: '2000/2050',
                            transparent: true
                        }, _.omit(layerConfig, function (value) {
                            return _.isFunction(value);
                        }));

                    //nullify empty string filter
                    if (_.isString(config.cql_filter) && config.cql_filter.trim().length === 0) {
                        config.cql_filter = null;
                    }

                    layer = new OpenLayers.Layer.WMS(layerConfig.name, layerConfig.url, config, {
                        singleTile: config.singleTile,
                        wrapDateLine: true,
                        visibility: !layerConfig.dontShow,
                        styles: layerConfig.styles,
                        env: layerConfig.env,
                        permanent: layerConfig.permanent //can it be removed via layer manager?
                    });
                    self.addLayer(layer, layerConfig.extent, layerConfig.loadStartCallback, layerConfig.loadEndCallback, layerConfig.layerAddedCallback);
                    if (!layerConfig.noGetInfoControl && !layer.isBaseLayer) {
                        $rootScope.$emit('AddGetInfoControl', layer, config);
                    }
                    return layer;
                };
                this.addVectorLayer = function (layerConfig) {
                    var layer = new OpenLayers.Layer.Vector(layerConfig.name, layerConfig);
                    self.addLayer(layer, layerConfig.extent, layerConfig.loadStartCallback, layerConfig.loadEndCallback, layerConfig.layerAddedCallback);
                    return layer;
                };
                this.removeLayersByName = function (names) {
                    if (!_.isArray(names)) {
                        names = [names];
                    }
                    _.each(names, function (name) {
                        _.each(scope.map.getLayersByName(name), function (layer) {
                            scope.map.removeLayer(layer);
                        });
                    });
                };
                this.replaceWmsLayers = function (namesToRemove, layerConfigToAdd) {
                    if (!_.isArray(namesToRemove)) {
                        namesToRemove = [namesToRemove];
                    }
                    _.each(namesToRemove, function (name) {
                        self.removeLayersByName(name);
                    });
                    return self.addWmsLayer(layerConfigToAdd);
                };
                this.replaceVectorLayers = function (namesToRemove, layerConfigToAdd) {
                    if (!_.isArray(namesToRemove)) {
                        namesToRemove = [namesToRemove];
                    }
                    _.each(namesToRemove, function (name) {
                        self.removeLayersByName(name);
                    });
                    return self.addVectorLayer(layerConfigToAdd);
                };

                _.each(CONFIG.map.overlays, function (layer) {
                    scope.map.setLayerIndex(this.addLayer(new OpenLayers.Layer.WMS(
                        layer.name, CONFIG.map.defaultUrl || layer.url,
                        {layers: layer.layers, format: layer.format, transparent: true, cql_filter: layer.cql_filter},
                        {wrapDateLine: true, isBaseLayer: false, visibility: layer.visibility}
                    )), 0);
                }, this);
                _.each(CONFIG.map.baseLayers, function (layer) {
                    scope.map.setLayerIndex(this.addLayer(new OpenLayers.Layer.WMS(
                        layer.name, CONFIG.map.defaultUrl || layer.url,
                        {layers: layer.layers, format: layer.format, transparent: true, cql_filter: layer.cql_filter},
                        {wrapDateLine: true, opacity: 1, isBaseLayer: true}
                    )), 0);
                }, this);
                scope.map.zoomToExtent(restrictedExtent);

                $rootScope.$on("AddWmsMapLayer", function (event, layerConfig) {
                    self.addWmsLayer(layerConfig);
                });
                $rootScope.$on("RemoveMapLayers", function (event, names) {
                    if (!_.isArray(names)) {
                        names = [names];
                    }
                    self.removeLayersByName(names);
                });
                $rootScope.$on("ReplaceWmsMapLayers", function (event, namesToRemove, layerConfigToAdd) {
                    self.replaceWmsLayers(namesToRemove, layerConfigToAdd);
                });
                $rootScope.$on("ReplaceVectorMapLayers", function (event, namesToRemove, layerConfigToAdd) {
                    self.replaceVectorLayers(namesToRemove, layerConfigToAdd);
                });
                $rootScope.$on("CenterPaneFullWidthChange", function (event, fullWidth) {
                    var center = scope.map.getCenter(), //remember center
                        zoom = scope.map.getZoom(); //remember zoom
                    scope.map.updateSize();
                    scope.map.setCenter(center, zoom); //re-center and zoom
                });
                $rootScope.$on("SetMapDataLayerZoomState", function (event, zoomedToDataLayer) {
                    scope.state.zoomedToDataLayer = zoomedToDataLayer;
                });
                $rootScope.$on('SetLayerVisibility', function (event, layerName, visibility) {
                    _.each(scope.map.getLayersByName(layerName), function (layer) {
                        layer.setVisibility(visibility);
                    });
                });
                $rootScope.$on('MapExtentCallback', function (event, callback) {
                    callback(scope.map.getExtent());
                });
                $rootScope.$on('RaiseLayers', function (event, names, delta) {
                    _.each(names, function (name) {
                        _.each(scope.map.getLayersByName(name), function (layer) {
                            scope.map.raiseLayer(layer, delta);
                        });
                    });
                });
            }
        };
    }]);
