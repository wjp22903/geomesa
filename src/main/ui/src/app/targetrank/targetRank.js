angular.module('stealth.targetrank.targetRank', [
    'stealth.common.map.openlayersMap',
    'stealth.common.panes.centerPane',
    'stealth.common.panes.leftPane',
    'stealth.common.panes.centerTop',
    'stealth.common.panes.centerRight',
    'stealth.targetrank.leftNav',
    'stealth.ows.ows',
    'ui.bootstrap.buttons'
])

    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/targetRank', {
            templateUrl: 'targetrank/targetRank.tpl.html'
        });
    }])

    .controller('TargetRankController', ['$scope', '$rootScope', '$modal', '$http', '$filter', 'WMS', 'WFS', 'CONFIG', function($scope, $rootScope, $modal, $http, $filter, WMS, WFS, CONFIG) {

        $scope.targetRank = {
            isLeftPaneVisible: true,
            leftPaneView: 'analysis',
            numSites: 0,
            numData: 0,
            numTargets: 0
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

        $scope.inputData = {};
        $scope.filterData = {};
        $scope.addSites = {};
        
        // Used to display form fields in a step-by-step manner.
        $scope.addSites.formStep = function () {
            var step = 1; // Show the server url input
            if ($scope.serverData.currentGeoserverUrl && !$scope.serverData.error) {
                step = 2; // Show the input type select 
                if ($scope.inputData.type) {
                    step = 3; // Show the layer select input
                    if($scope.layerData.currentLayer && !$scope.layerData.error) {
                        step = 4; // Show the layer details and cql query input
                    }
                }
            } 
            return step;
        };
        
        // When the user changes the input data type, call getCapabilities
        $scope.$watch('inputData.type', function (newVal, oldVal) {
            if (newVal !== oldVal) {
                $scope.addSites.updateServer();
            }
        });

        // Invoked when the user clicks the 'Choose' button on the server url field.
        $scope.addSites.updateServer = function () {
            $scope.serverData.currentGeoserverUrl = $scope.serverData.proposedGeoserverUrl;
            $scope.layerData = {};
            $scope.filterData = {};
           
            // Get the layer list from the GetCapabilities WMS operation.
            WMS.getCapabilities($scope.serverData.currentGeoserverUrl).then(function (data) {
                var layers = data.capability.layers;
                $scope.serverData.error = null;
                $scope.layerData.layers = layers;
            }, function (reason) {
                // The GetCapabilites request failed.
                $scope.serverData.error = 'GetCapabilities request failed. Error: ' + reason.status + ' ' + reason.statusText;
            });
        };
        
        // Invoked when the current selected layer changes.
        $scope.addSites.getFeatureTypeDescription = function () {
            WFS.getFeatureTypeDescription($scope.serverData.currentGeoserverUrl, $scope.layerData.currentLayer.name).then(function (data) {
                $scope.layerData.error = null;
                $scope.featureTypeData = data;
                $scope.filterData = {};

                if (data.error) {
                    $scope.featureTypeData = 'unavailable';
                    // Response is successfull, but no description is found for the type.
                }
            }, function (reason) {
                $scope.serverData.error = 'GetFeatureTypeDescription request failed. Error: ' + reason.status + ' ' + reason.statusText;
            });
        };

        $scope.addSites.getFeature = function () {
            var url = $scope.serverData.currentGeoserverUrl,
                layerName = $scope.layerData.currentLayer.name,
                cql = $scope.filterData.cql;

            WFS.getFeature(url, layerName, {cql_filter: cql}).then(function (response) {
                $scope.targetRank.numSites = response.data.totalFeatures;
                $scope.targetRank.sites = response.data.features;
                
                // Update the map.
                $rootScope.$emit("AddWmsMapLayer", {
                    name: 'Sites',
                    url: $filter('endpoint')(url, 'wms', true),
                    layers: [layerName],
                    cql_filter: cql
                });

            }, function (response) {
                // TODO - handle error. Clear the map on failure?
            });
        };
        
        $scope.addSites.submit = function () {
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
