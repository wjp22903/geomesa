angular.module('stealth.common.map.openlayersMap', [
    'ngResource'
])

    .directive('openlayersMap', ['$rootScope', '$timeout', 'CONFIG', function ($rootScope, $timeout, CONFIG) {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                map: '='
            },
            template: '<div class="anchorTop anchorBottom anchorLeft anchorRight map-bg">' +
                          '<div class="mapSpinner" ng-show="loading.count > 0">' +
                              '<div class="fa-stack fa-lg">' +
                                  '<i class="fa fa-spinner fa-stack-2x fa-spin"></i>' +
                                  '<span class="fa fa-stack-text fa-stack-1x">{{loading.count}}</span>' +
                              '</div>' +
                          '</div>' +
                      '</div>',
            link: function (scope, element, attrs) {
                scope.loading = {
                    count: 0
                };
                scope.map = new OpenLayers.Map(attrs.id, {
                    controls: [
                        new OpenLayers.Control.ZoomPanel(),
                        new OpenLayers.Control.LayerSwitcher(),
                        new OpenLayers.Control.MousePosition(),
                        new OpenLayers.Control.NavToolbar()
                    ],
                    projection: CONFIG.map.crs,
                    layers: [
                        new OpenLayers.Layer.WMS(
                            "Base", CONFIG.map.url,
                            {layers: CONFIG.map.baseLayers, format: CONFIG.map.format},
                            {wrapDateLine: true}
                        )
                    ]
                });
                scope.map.setCenter([CONFIG.map.defaultLon, CONFIG.map.defaultLat], CONFIG.map.defaultZoom);

                function addLayer (layer) {
                    layer.events.register('loadstart', null, function (event) {
                        $timeout(function () {
                            scope.loading.count++;
                        });
                    });
                    layer.events.register('loadend', null, function (event) {
                        $timeout(function () {
                            scope.loading.count--;
                        });
                    });
                    scope.map.addLayer(layer);
                }
                function addWmsLayer (layerConfig) {
                    var layer,
                        config = {
                            layers: layerConfig.layers,
                            format: 'image/png',
                            transparent: true
                        };
                    if (layerConfig.cql_filter) {
                        config.cql_filter = layerConfig.cql_filter;
                    }
                    layer = new OpenLayers.Layer.WMS(layerConfig.name, layerConfig.url, config, {wrapDateLine: true});
                    addLayer(layer);
                }
                function removeLayersByName (name) {
                    _.each(scope.map.getLayersByName(name), function (layer) {
                        scope.map.removeLayer(layer);
                    });
                }
                function replaceWmsLayers (namesToRemove, layerConfigToAdd) {
                    _.each(namesToRemove, function (name) {
                        removeLayersByName(name);
                    });
                    addWmsLayer(layerConfigToAdd);
                }

                $rootScope.$on("AddWmsMapLayer", function (event, layerConfig) {
                    addWmsLayer(layerConfig);
                });
                $rootScope.$on("RemoveMapLayers", function (event, name) {
                    removeLayersByName(name);
                });
                $rootScope.$on("ReplaceWmsMapLayers", function (event, namesToRemove, layerConfigToAdd) {
                    replaceWmsLayers(namesToRemove, layerConfigToAdd);
                });
                $rootScope.$on("CenterPaneFullWidthChange", function (event, fullWidth) {
                    scope.map.updateSize();
                });
            }
        };
    }]);
