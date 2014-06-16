angular.module('stealth.siterank.siteRank', [
])

    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/siteRank', {
            templateUrl: 'siterank/siteRank.tpl.html'
        });
    }])

    .controller('SiteRankController', ['$scope', '$rootScope', '$modal', '$filter', 'WMS', 'WFS', 'ProximityService', 'CONFIG', function($scope, $rootScope, $modal, $filter, WMS, WFS, ProximityService, CONFIG) {
        $scope.siteRank = {
            isLeftPaneVisible: true,
            leftPaneView: 'analysis',
            targets: [],
            options: {},
            siteLayers: _.chain(_.keys(CONFIG.dataSources.sites))
                // Streamline the properties we are including.
                .map(function (layer) {
                    var parts = layer.split(':', 2);
                    return {
                        prefix: parts[0],
                        name: layer,
                        spatialQueryCount: null
                    };
                })
                // Build a map of workspaces
                .groupBy('prefix')
                // Only include the workspaces specified in the config.
                .pick(CONFIG.geoserver.workspaces.site)
                .value(),
            numSites: 0,
            matchDatasourceAndGeoserverWorkspace: function (layer) {
                return _.contains(_.keys(CONFIG.dataSources.targets), layer.name) && _.some(CONFIG.geoserver.workspaces.data, function (workspace) {
                    var str = workspace + ':';
                    return layer.name.substring(0, str.length) === str;
                });
            },
            removeTarget: function (targetToRemove) {
                $rootScope.$emit('RemoveMapLayers', targetToRemove.layer.name);
                _.remove($scope.siteRank.targets, function (target) {
                    return _.isEqual(target, targetToRemove);
                });
            },
            updateNumSites: function () {
                $scope.siteRank.numSites = _.chain($scope.siteRank.siteLayers).values().flatten().reduce(function (count, layer) {
                    if (layer.isSelected) {
                        count++;
                    }
                    return count;
                }, 0).value();
            },
            doProximity: function (geoserverUrl, layerName, cql_filter) {
                var proxFn = ProximityService.doLayerProximity,
                    proxArg = {
                        geoserverUrl: geoserverUrl,
                        inputLayer: layerName,
                        inputLayerFilter: cql_filter,
                        dataLayerFilter: '1=1',
                        bufferMeters: $scope.siteRank.options.proximityMeters
                    };
                _.chain($scope.siteRank.siteLayers).values().flatten().filter(function (siteLayer) {
                    return siteLayer.isSelected;
                }).forEach(function (siteLayer) {
                    proxArg.dataLayer = siteLayer.name;
                    siteLayer.spatialQueryCount++;
                    proxFn(proxArg).then(function () {
                        siteLayer.spatialQueryCount--;
                    }, function () {
                        siteLayer.spatialQueryCount--;
                    });
                });
            },
            run: function () {
                _.chain($scope.siteRank.siteLayers).values().flatten().forEach(function (siteLayer) {
                    siteLayer.spatialQueryCount = siteLayer.isSelected ? 0 : null;
                });
                _.forEach($scope.siteRank.targets, function (target) {
                    var layerName = target.layer.name,
                        cql_filter = '(' + target.idField + "='" + target.idValue + "')",
                        geoserverUrl = $filter('endpoint')(target.geoserverUrl, 'wms', true);
                    if (!_.isEmpty($scope.siteRank.options.startTime)) {
                        cql_filter += ' AND (dtg > ' + $scope.siteRank.options.startTime + ')';
                    }
                    if (!_.isEmpty($scope.siteRank.options.endTime)) {
                        cql_filter += ' AND (dtg < ' + $scope.siteRank.options.endTime + ')';
                    }
                    target.spatialQueryStatus = 'running';
                    $rootScope.$emit("ReplaceWmsMapLayers", [layerName], {
                        name: layerName,
                        url: geoserverUrl,
                        layers: [layerName],
                        cql_filter: cql_filter,
                        loadEndCallback: function () {
                            target.spatialQueryStatus = 'done';
                        }
                    });
                    $scope.siteRank.doProximity(geoserverUrl, layerName, cql_filter);
                });
                //TODO - site rank
            }
        };

        $scope.addTargets = {
            serverData: {
                // The value the user enters into the form.
                proposedGeoserverUrl: CONFIG.geoserver.defaultUrl,
                // The value after the users clicks 'Choose'.
                currentGeoserverUrl: null
            },
            layerData: {},
            targetData: {},
            submit: function () {
                $scope.addTargets.getFeature();
            },
            showWindow: function () {
                $modal.open({
                    scope: $scope,
                    backdrop: 'static',
                    templateUrl: 'siterank/addTargetsForm.tpl.html',
                    controller: function ($scope, $modalInstance) {
                        $scope.modal = {
                            cancel: function () {
                                $modalInstance.dismiss('cancel');
                            }
                        };
                    }
                });
            },
            formStep: function () {
                var step = 1; // Show the server url input
                if ($scope.addTargets.serverData.currentGeoserverUrl && !$scope.addTargets.serverData.error &&
                        $scope.addTargets.layerData && $scope.addTargets.layerData.layers) {
                    step = 2; // Show the input type select
                    if($scope.addTargets.layerData.currentLayer && !$scope.addTargets.layerData.error && $scope.addTargets.featureTypeData) {
                        step = 3; // Show the layer details and ID input
                    }
                }
                return step;
            },
            updateServer: function () {
                $scope.addTargets.serverData.error = null;
                $scope.addTargets.showSpinner = true;
                $scope.addTargets.serverData.currentGeoserverUrl = $scope.addTargets.serverData.proposedGeoserverUrl;
                $scope.addTargets.targetData = {};
                $scope.addTargets.layerData = {};

                // Get the layer list from the GetCapabilities WMS operation.
                WMS.getCapabilities($scope.addTargets.serverData.currentGeoserverUrl).then(function (data) {
                    var layers = data.capability.layers;
                    $scope.addTargets.serverData.error = null;
                    $scope.addTargets.layerData.layers = layers;

                    $scope.addTargets.siteLayers = _.chain(_.filter(layers, function (layer) {
                        return _.contains(_.keys(CONFIG.dataSources.sites), layer.name);
                    }))
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
                    $scope.addTargets.serverData.error = 'GetCapabilities request failed. Error: ' + reason.status + ' ' + reason.statusText;
                }).finally(function () {
                    $scope.addTargets.showSpinner = false;
                });
            },
            getFeatureTypeDescription: function () {
                $scope.addTargets.layerData.error = null;
                $scope.addTargets.showSpinner = true;
                $scope.addTargets.targetData = {};
                $scope.addTargets.featureTypeData = null;

                WFS.getFeatureTypeDescription($scope.addTargets.serverData.currentGeoserverUrl, $scope.addTargets.layerData.currentLayer.name).then(function (data) {
                    $scope.addTargets.featureTypeData = data;
                    if (data.error) {
                        $scope.addTargets.featureTypeData = 'unavailable';
                        // Response is successful, but no description is found for the type.
                    }
                }, function (reason) {
                    $scope.addTargets.serverData.error = 'GetFeatureTypeDescription request failed. Error: ' + reason.status + ' ' + reason.statusText;
                }).finally(function () {
                    $scope.addTargets.showSpinner = false;
                });
            },
            getFeature: function () {
                $scope.siteRank.targets.push({
                    geoserverUrl: $scope.addTargets.serverData.currentGeoserverUrl,
                    layer: $scope.addTargets.layerData.currentLayer,
                    idField: CONFIG.dataSources.targets[$scope.addTargets.layerData.currentLayer.name].idField,
                    idValue: $scope.addTargets.targetData.id
                });
            }
        };
    }]);
