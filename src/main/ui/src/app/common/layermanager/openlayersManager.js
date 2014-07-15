angular.module('stealth.common.layermanager.openlayersManager', [
    'stealth.ows.ows'
])

    // TODO - there's a lot of duplication with targetRank.js
    .directive('openlayersManager', [
    '$rootScope', '$modal', '$filter', 'WMS', 'WFS', 'CONFIG',
    function ($rootScope, $modal, $filter, WMS, WFS, CONFIG) {
        return {
            restrict: 'AE',
            templateUrl: 'common/layermanager/layerManager.tpl.html',
            replace: true,
            scope: {
                map: '='
            },
            controller: function ($scope) {
                $scope.query = {
                    serverData: {
                        // The value the user enters into the form.
                        proposedGeoserverUrl: CONFIG.geoserver.defaultUrl,
                        // The value after the users clicks 'Choose'.
                        currentGeoserverUrl: null
                    },
                    layerData: {}
                };

                // TODO - this could be generalized as it's used in targetRank.js
                $scope.query.formStep = function () {
                    var step = 1; // Show the server url input
                    if ($scope.query.serverData.currentGeoserverUrl && !$scope.query.serverData.error &&
                            $scope.query.layerData && $scope.query.layerData.layers) {
                        step = 2; // Show the layer select input.
                        if($scope.query.layerData.currentLayer && !$scope.query.layerData.error) {
                            step = 3; // Show the layer details and cql query input
                            if($scope.query.layerData.currentLayerFriendlyName) {
                                step = 4;
                            }
                        }
                    }
                    return step;
                };

                // Get capabilities.
                $scope.query.updateServer = function () {
                    $scope.query.serverData.currentGeoserverUrl = $scope.query.serverData.proposedGeoserverUrl;
                    WMS.getCapabilities($scope.query.serverData.currentGeoserverUrl).then(function (data) {
                        var layers = data.capability.layers;
                        $scope.query.getCapabilitiesError = null;
                        $scope.query.layerData.layers = layers;
                        $scope.query.layerData.currentLayerFriendlyName = null;
                        console.log(layers);
                    });
                };

                // Invoked when the current selected layer changes.
                $scope.query.getFeatureTypeDescription = function () {
                    $scope.query.layerData.error = null;
                    $scope.query.layerData.currentLayerFriendlyName = $scope.query.layerData.currentLayer.name;
                    $scope.query.filterData = {};
                    $scope.query.featureTypeData = null;

                    WFS.getFeatureTypeDescription($scope.query.serverData.currentGeoserverUrl, $scope.query.layerData.currentLayer.name).then(function (data) {
                        $scope.query.featureTypeData = data;
                        console.log(data);
                        if (data.error) {
                            $scope.query.featureTypeData = 'unavailable';
                            // Response is successful, but no description is found for the type.
                        }
                    }, function (reason) {
                        $scope.query.serverData.error = 'GetFeatureTypeDescription request failed. Error: ' + reason.status + ' ' + reason.statusText;
                    });
                };

                $scope.query.showForm = function () {
                    $modal.open({
                        scope: $scope,
                        backdrop: 'static',
                        templateUrl: 'common/layermanager/queryForm.tpl.html',
                        controller: function ($scope, $modalInstance) {
                            $scope.modal = {
                                cancel: function () {
                                    $modalInstance.dismiss('cancel');
                                }
                            };
                        }
                    });
                };

                $scope.query.addLayer = function () {
                    $rootScope.$emit("AddWmsMapLayer", {
                        name: $scope.query.layerData.currentLayerFriendlyName,
                        url: $filter('endpoint')($scope.query.serverData.currentGeoserverUrl, 'wms', true),
                        layers: $scope.query.layerData.currentLayer.name,
                        cql_filter: $scope.query.filterData.cql
                    });
                };
            }
        };
    }])

    // This directive manages a list of layers.
    .directive('layerList', [function () {
        return {
            restrict: 'AE',
            templateUrl: 'common/layermanager/layerList.tpl.html',
            replace: true,
            controller: function ($scope) {
                this.removeLayer = function (layer) {
                    $scope.$apply(function (scope) {
                        if (!layer.isBaseLayer) {
                            $scope.map.removeLayer(layer);
                        }
                    });
                };

                // Moves an item up or down
                // TODO - drag & drop
                this.bump = function (layer, delta) {
                    $scope.$apply(function (scope) {
                        var numBaseLayers = _.reduce($scope.map.layers, function (count, l) {
                            if (l.isBaseLayer) {
                                count++;
                            }
                            return count;
                        }, 0);
                        //Keep base layers on bottom
                        if (($scope.map.getLayerIndex(layer) + delta) >= numBaseLayers) {
                            $scope.map.raiseLayer(layer, delta);
                        }
                    });
                };
            }
        };
    }])

    .directive('layerControl', [function () {
        return {
            restrict: 'AE',
            templateUrl: 'common/layermanager/layerControl.tpl.html',
            // Require the controller in the above directive.
            require: '^layerList',
            scope: {
                // See layerList.tpl.html
                layerData: '='
            },
            link: function (scope, element, attrs, controller) {
                scope.control = {
                    opacity: scope.layerData.opacity,
                    visibility: scope.layerData.getVisibility(),
                    changeOpacity: function (layer, opacity) {
                        if (_.isNumber(opacity)) {
                            if (opacity < 0) {
                                opacity = 0;
                            }
                            if (opacity > 1) {
                                opacity = 1;
                            }
                            layer.setOpacity(opacity);
                            scope.control.opacity = opacity;
                        }
                    },
                    changeVisibility: function (layer, visibility) {
                        layer.setVisibility(visibility);
                    }
                };
                // Bind a single click event to the element, and determine
                // what to do based on the target.
                element.click(function (e) {
                    var target = $(e.target).closest('.ctrl');
                    if (target.hasClass('remove')) {
                        controller.removeLayer(scope.layerData);
                    } else if (target.hasClass('up')) {
                        controller.bump(scope.layerData, 1);
                    } else if (target.hasClass('down')) {
                        controller.bump(scope.layerData, -1);
                    }
                });
            }
        };
    }])
;
