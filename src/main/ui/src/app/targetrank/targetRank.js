angular.module('stealth.targetrank.targetRank', [
    'stealth.common.proximity',
    'stealth.common.utils',
    'stealth.common.map.openlayersMap',
    'stealth.common.panes.centerPane',
    'stealth.common.panes.leftPane',
    'stealth.common.panes.centerTop',
    'stealth.common.panes.centerRight',
    'stealth.common.groupCheckbox',
    'stealth.ows.ows',
    'ui.layout',
    'ui.bootstrap.buttons'
])

    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/targetRank', {
            templateUrl: 'targetrank/targetRank.tpl.html'
        });
    }])

    .controller('TargetRankController', ['$scope', '$rootScope', '$modal', '$http', '$filter', 'WMS', 'WFS', 'CONFIG', 'ProximityService', function($scope, $rootScope, $modal, $http, $filter, WMS, WFS, CONFIG, ProximityService) {
        $scope.targetRank = {
            isLeftPaneVisible: true,
            leftPaneView: 'analysis',
            //Input Data for current analysis, not what's on the add form
            inputData: {},
            numSites: 0,
            numData: 0,
            numTargets: 0,
            matchGeoserverWorkspace: function(layer) {
                return _.some(CONFIG.geoserver.workspaces[$scope.inputData.type], function (workspace) {
                    var str = workspace + ':';
                    return layer.name.substring(0, str.length) === str;
                });
            }
        };

        $scope.targetRank.doProximity = function () {
            var proxFn, proxArg = {
                geoserverUrl: $scope.serverData.currentGeoserverUrl,
                inputLayer: $scope.layerData.currentLayer.name,
                inputLayerFilter: $scope.filterData.cql
            };
            switch ($scope.inputData.type) {
                case 'site':
                    proxFn = ProximityService.doLayerProximity;
                    proxArg = _.merge(proxArg, {
                        dataLayerFilter: 'dtg BETWEEN ' + $scope.options.startTime + ' AND ' + $scope.options.endTime,
                        bufferDegrees: $scope.options.proximityDegrees
                    });
                    break;
                case 'track':
                    proxFn = ProximityService.doTrackProximity;
                    proxArg = _.merge(proxArg, {
                        maxSpeedMps: $scope.options.maxSpeedMps,
                        maxTimeSec: $scope.options.maxTimeSec
                    });
                    break;
                //TODO - connect to Route Search
                /*case 'route':
                    proxFn = ProximityService.doRouteProximity;
                    break;*/
                default:
                    alert('Error: No proximity search available for this input type');
            }

            if (_.isFunction(proxFn)) {
                _.chain($scope.dataLayers).values().flatten().filter(function (dataLayer) {
                    delete dataLayer.spatialQueryStatus;
                    return dataLayer.isSelected;
                }).forEach(function (dataLayer) {
                    proxArg.dataLayer = dataLayer.name;
                    dataLayer.spatialQueryStatus = 'running';
                    proxFn(proxArg).then(function () {
                        dataLayer.spatialQueryStatus = 'done';
                    }, function () {
                        dataLayer.spatialQueryStatus = 'error';
                    });
                });
            }
        };

        $scope.targetRank.run = function () {
            $scope.targetRank.doProximity();
            //TODO - get target ranks
        };

        // Geoserver url
        $scope.serverData = {
            // The value the user enters into the form.
            proposedGeoserverUrl: CONFIG.geoserver.defaultUrl,
            // The value after the users clicks 'Choose'.
            currentGeoserverUrl: null
        };

        // Layers returned from a GetCapabilities query.
        $scope.layerData = {
            layers: null,
            currentLayer: null,
            currentLayerDescription: null
        };

        $scope.options = {};
        $scope.dataLayers = {};
        $scope.layerData = {};
        $scope.inputData = {};
        $scope.filterData = {};
        $scope.addSites = {
            types: [{
                key: 'site',
                display: 'Sites'
            }, {
                key: 'track',
                display: 'Track'
            }, {
                key: 'route',
                display: 'Route'
            }]
        };

        // Used to display form fields in a step-by-step manner.
        $scope.addSites.formStep = function () {
            var step = 1; // Show the server url input
            if ($scope.serverData.currentGeoserverUrl && !$scope.serverData.error &&
                    $scope.layerData && $scope.layerData.layers) {
                step = 2; // Show the input type select
                if ($scope.inputData.type) {
                    step = 3; // Show the layer select input
                    if($scope.layerData.currentLayer && !$scope.layerData.error && $scope.featureTypeData) {
                        step = 4; // Show the layer details and cql query input
                    }
                }
            }
            return step;
        };

        // When the user changes the input data type, call getCapabilities
        $scope.$watch('inputData.type', function (newVal, oldVal) {
            $scope.addSites.showSpinner = true;
            if (newVal !== oldVal) {
                if ($scope.inputData.type) {
                    $scope.inputData.display = _.find($scope.addSites.types, function (type) {
                        return type.key === $scope.inputData.type;
                    }).display;
                } else {
                    $scope.inputData.display = null;
                }
                $scope.layerData.currentLayer = null;
            }
            $scope.addSites.showSpinner = false;
        });

        // Invoked when the user clicks the 'Choose' button on the server url field.
        $scope.addSites.updateServer = function () {
            $scope.serverData.error = null;
            $scope.addSites.showSpinner = true;
            $scope.serverData.currentGeoserverUrl = $scope.serverData.proposedGeoserverUrl;
            $scope.inputData = {};
            $scope.layerData = {};
            $scope.filterData = {};

            // Get the layer list from the GetCapabilities WMS operation.
            WMS.getCapabilities($scope.serverData.currentGeoserverUrl).then(function (data) {
                var layers = data.capability.layers;
                $scope.serverData.error = null;
                $scope.layerData.layers = layers;

                $scope.dataLayers = _.chain(layers)
                    // Streamline the properties we are including.
                    .map(function (workspace) {
                        return _.pick(workspace, ['name', 'prefix']);
                    })
                    // Build a map of workspaces
                    .groupBy('prefix')
                    // Only include the workspaces specified in the config.
                    .pick(CONFIG.geoserver.workspaces.data)
                    .value();
            }, function (reason) {
                // The GetCapabilites request failed.
                $scope.serverData.error = 'GetCapabilities request failed. Error: ' + reason.status + ' ' + reason.statusText;
            }).finally(function () {
                $scope.addSites.showSpinner = false;
            });
        };

        // Invoked when the current selected layer changes.
        $scope.addSites.getFeatureTypeDescription = function () {
            $scope.layerData.error = null;
            $scope.addSites.showSpinner = true;
            $scope.filterData = {};
            $scope.featureTypeData = null;

            WFS.getFeatureTypeDescription($scope.serverData.currentGeoserverUrl, $scope.layerData.currentLayer.name).then(function (data) {
                $scope.featureTypeData = data;
                if (data.error) {
                    $scope.featureTypeData = 'unavailable';
                    // Response is successful, but no description is found for the type.
                }
            }, function (reason) {
                $scope.serverData.error = 'GetFeatureTypeDescription request failed. Error: ' + reason.status + ' ' + reason.statusText;
            }).finally(function () {
                $scope.addSites.showSpinner = false;
            });
        };

        $scope.addSites.getFeature = function () {
            var url = $scope.serverData.currentGeoserverUrl,
                layerName = $scope.layerData.currentLayer.name,
                cql = $scope.filterData.cql;

            WFS.getFeature(url, layerName, {cql_filter: cql}).then(function (response) {
                $scope.targetRank.numSites = response.data.totalFeatures;
                $scope.targetRank.sites = response.data.features;

                $scope.options = {};

                var extent = null,
                    parser = new OpenLayers.Format.GeoJSON(),
                    features = parser.read(JSON.stringify(response.data));
                if (features && features.length > 0) {
                    extent = new OpenLayers.Bounds();
                    _.forEach(features, function (feature) {
                        extent.extend(feature.geometry.getBounds());
                    });
                }

                // Update the map.
                $rootScope.$emit("ReplaceWmsMapLayers", _.pluck($scope.addSites.types, 'display'), {
                    name: $scope.targetRank.inputData.display,
                    url: $filter('endpoint')(url, 'wms', true),
                    layers: [layerName],
                    cql_filter: cql,
                    extent: extent
                });
            });
        };

        $scope.addSites.submit = function () {
            $scope.targetRank.inputData = angular.copy($scope.inputData);
            $scope.addSites.getFeature();
        };

        $scope.addSites.showWindow = function () {
            $modal.open({
                scope: $scope,
                backdrop: 'static',
                templateUrl: 'targetrank/addSitesForm.tpl.html',
                controller: function ($scope, $modalInstance) {
                    $scope.modal = {
                        cancel: function () {
                            $modalInstance.dismiss('cancel');
                        }
                    };
                }
            });
        };
    }]);
