angular.module('stealth.common.map.openlayersMap', [
    'stealth.common.utils',
    'stealth.ows.ows'
])

    .directive(
    'openlayersMap', ['$rootScope', '$timeout', '$filter', '$compile', '$modal', 'CONFIG', 'Utils',
    function ($rootScope, $timeout, $filter, $compile, $modal, CONFIG, Utils) {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                map: '='
            },
            template: '<div class="anchorTop anchorBottom anchorLeft anchorRight map">' +
                          '<div class="mapSpinner" ng-show="loading.count > 0">' +
                              '<div class="fa-stack fa-lg">' +
                                  '<i class="fa fa-spinner fa-stack-2x fa-spin"></i>' +
                                  '<span class="fa fa-stack-text fa-stack-1x">{{loading.count}}</span>' +
                              '</div>' +
                          '</div>' +
                      '</div>',
            link: function (scope, element, attrs) {
                var restrictedExtent = _.isEmpty(CONFIG.map.restrictedExtent) ? new OpenLayers.Bounds(-360, -90, 360, 90) : OpenLayers.Bounds.fromString(CONFIG.map.restrictedExtent),
                    maxExtent = _.isEmpty(CONFIG.map.maxExtent) ? new OpenLayers.Bounds(-360, -90, 360, 90) : OpenLayers.Bounds.fromString(CONFIG.map.maxExtent);
                scope.loading = {
                    count: 0
                };
                scope.state = {
                    zoomedToDataLayer: false
                };
                scope.map = new OpenLayers.Map(attrs.id, _.merge(_.isEmpty(CONFIG.map.maxExtent) ? {} : {maxExtent: maxExtent}, {
                    numZoomLevels: 24,
                    controls: [
                        new OpenLayers.Control.ZoomPanel(),
                        new OpenLayers.Control.MousePosition(),
                        new OpenLayers.Control.NavToolbar()
                    ],
                    projection: CONFIG.map.crs,
                    restrictedExtent: restrictedExtent
                }));
                scope.mapPopup = {
                    list: {
                        currentPage: 1,
                        pageSize: 10,
                        numberOfPages: function () {
                            if (scope.featureColl && scope.featureColl.features) {
                                return Math.ceil(scope.featureColl.features.length/scope.mapPopup.list.pageSize);
                            }
                            return 0;
                        }
                    },
                    showWindow: function () {
                        scope.mapPopup.list.currentPage = 1;
                        $modal.open({
                            scope: scope,
                            backdrop: 'static',
                            templateUrl: 'common/map/mapPopup.tpl.html',
                            controller: function ($scope, $modalInstance) {
                                $scope.modal = {
                                    cancel: function () {
                                        $modalInstance.dismiss('cancel');
                                    }
                                };
                            }
                        });
                    },
                    showHistory: function (idField, props) {
                        showHistory(scope.curLayer.url.substring(5), idField, props[idField], scope.curDataLayer);
                    }
                };

                function showHistory (url, idField, idValue, layerCsv) {
                    scope.map.raiseLayer(replaceWmsLayers([idValue], {
                        name: idValue,
                        url: url,
                        cql_filter: idField + " = '" + idValue + "'",
                        layers: layerCsv,
                        styles: 'stealth_dataPoints',
                        env: 'color:' + Utils.getBrightColor().substring(1)
                    }), -1);
                    scope.map.raiseLayer(replaceWmsLayers([idValue + '_heatmap'], {
                        name: idValue + '_heatmap',
                        url: url,
                        cql_filter: idField + " = '" + idValue + "'",
                        layers: layerCsv,
                        styles: 'stealth_heatmap',
                        singleTile: true,
                        dontShow: true
                    }), -1);
                }
                function addLayer (layer, extent, loadStartCallback, loadEndCallback, layerAddedCallback) {
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
                }
                function addWmsLayer (layerConfig) {
                    var layer,
                        config = _.merge({
                            format: 'image/png',
                            time: '2000/2050',
                            transparent: true
                        }, _.omit(layerConfig, function (value) {
                            return _.isFunction(value);
                        }));

                    //nullify empty string filter
                    if (_.isString(config.cql_filer) && config.trim().length === 0) {
                        config.cql_filter = null;
                    }

                    layer = new OpenLayers.Layer.WMS(layerConfig.name, layerConfig.url, config, {singleTile: config.singleTile, wrapDateLine: true, visibility: !layerConfig.dontShow});
                    addLayer(layer, layerConfig.extent, layerConfig.loadStartCallback, layerConfig.loadEndCallback, layerConfig.layerAddedCallback);
                    if (layerConfig.addGetInfoControl) {
                        addGetInfoControl(layer, layerConfig);
                    }
                    return layer;
                }
                function addVectorLayer (layerConfig) {
                    var layer = new OpenLayers.Layer.Vector(layerConfig.name, layerConfig);
                    addLayer(layer, layerConfig.extent, layerConfig.loadStartCallback, layerConfig.loadEndCallback, layerConfig.layerAddedCallback);
                    return layer;
                }
                function addGetInfoControl(layer, layerConfig) {
                    var ctrl = new OpenLayers.Control.WMSGetFeatureInfo({
                        url: $filter('endpoint')(layerConfig.url, 'wms'),
                        title: 'Hover',
                        layers: [layer],
                        layerUrls: [layerConfig.url],
                        infoFormat: 'application/json',
                        maxFeatures: 100,
                        queryVisible: true
                    });
                    ctrl.events.register("getfeatureinfo", null, function (evt) {
                        $timeout(function () {
                            scope.curLayer = evt.object.layers[0];
                            scope.curDataLayer = scope.curLayer.name.replace(/proximity_\w*_(\w*)___(\w)/, "$1:$2");
                            try {
                                scope.featureColl = JSON.parse(evt.text);
                                if (!_.isEmpty(scope.featureColl.features)) {
                                    scope.mapPopup.showWindow();
                                }
                            } catch (e) {
                                //fail silently, for now
                                console.log(e.message);
                            }
                        });
                    });
                    scope.map.addControl(ctrl);
                    ctrl.activate();
                }
                function removeLayersByName (names) {
                    if (!_.isArray(names)) {
                        names = [names];
                    }
                    _.each(names, function (name) {
                        _.each(scope.map.getLayersByName(name), function (layer) {
                            scope.map.removeLayer(layer);
                        });
                    });
                }
                function replaceWmsLayers (namesToRemove, layerConfigToAdd) {
                    if (!_.isArray(namesToRemove)) {
                        namesToRemove = [namesToRemove];
                    }
                    _.each(namesToRemove, function (name) {
                        removeLayersByName(name);
                    });
                    return addWmsLayer(layerConfigToAdd);
                }
                function replaceVectorLayers (namesToRemove, layerConfigToAdd) {
                    if (!_.isArray(namesToRemove)) {
                        namesToRemove = [namesToRemove];
                    }
                    _.each(namesToRemove, function (name) {
                        removeLayersByName(name);
                    });
                    return addVectorLayer(layerConfigToAdd);
                }

                addLayer(new OpenLayers.Layer.WMS(
                    "Base Map", CONFIG.map.url,
                    {layers: CONFIG.map.baseLayers, format: CONFIG.map.format, bgcolor: '0xa7b599'},
                    {wrapDateLine: true, opacity: 0.5}
                ));
                scope.map.zoomToExtent(restrictedExtent);

                $rootScope.$on("AddWmsMapLayer", function (event, layerConfig) {
                    addWmsLayer(layerConfig);
                });
                $rootScope.$on("RemoveMapLayers", function (event, names) {
                    if (!_.isArray(names)) {
                        names = [names];
                    }
                    removeLayersByName(names);
                });
                $rootScope.$on("ReplaceWmsMapLayers", function (event, namesToRemove, layerConfigToAdd) {
                    replaceWmsLayers(namesToRemove, layerConfigToAdd);
                });
                $rootScope.$on("ReplaceVectorMapLayers", function (event, namesToRemove, layerConfigToAdd) {
                    replaceVectorLayers(namesToRemove, layerConfigToAdd);
                });
                $rootScope.$on("CenterPaneFullWidthChange", function (event, fullWidth) {
                    scope.map.updateSize();
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
                $rootScope.$on('ShowTargetHistory', function (event, url, idField, idValue, layerCsv) {
                    showHistory(url, idField, idValue, _.isArray(layerCsv) ? layerCsv.join(',') : layerCsv);
                });
            }
        };
    }]);
