angular.module('stealth.siteactivity.siteActivity', [
    'stealth.common.map.leafletMap',
    'stealth.common.panes.centerPane',
    'stealth.common.panes.leftPane',
    'stealth.common.panes.centerTop',
    'stealth.common.panes.centerRight',
    'stealth.siteactivity.leftNav'
])

    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/siteactivity', {
            templateUrl: 'siteactivity/siteActivity.tpl.html',
            controller: 'SiteActivityController'
        });
    }])

    .controller('SiteActivityController', ['$scope', '$rootScope', '$modal', '$http', 'MapService', function($scope, $rootScope, $modal, $http, MapService) {
        $scope.isLeftPaneVisible = true;
        $scope.isCenterTopVisible = true;
        $scope.isCenterRightVisible = true;
        $scope.vizitems = ['blue', 'green', 'map', 'other'];
        $scope.viz = $scope.vizitems[2];
        $scope.numSites = 0;
        $scope.numData = 0;
        $scope.numTargets = 0;
        $scope.sites = [{properties: {STATE_NAME: '(none)'}}];

        $scope.addSites = {
            formData: {
                service: 'WFS',
                version: '2.0.0',
                request: 'GetFeature',
                typeName: 'topp:states',
                outputFormat: 'application/json'
            },
            showWindow: function () {
                $modal.open({
                    scope: $scope,
                    templateUrl: 'siteactivity/addSitesForm.tpl.html',
                    controller: function ($scope, $modalInstance) {
                        $scope.submit = function () {
                            var cql_filter = $scope.addSites.formData.cql_filter;
                            $http.get('cors/http://localhost:8081/geoserver/wfs', {params: $scope.addSites.formData})
                                .success(function (data) {
                                    $modalInstance.close();
                                    $rootScope.$broadcast("AddMapLayer", {
                                        url: 'http://localhost:8081/geoserver/wms',
                                        layers: ['topp:states'],
                                        cql_filter: cql_filter
                                    });
                                    $scope.$parent.numSites += data.totalFeatures;
                                    $scope.$parent.sites = data.features;
                                });
                        };
                        $scope.cancel = function () {
                            $modalInstance.dismiss('cancel');
                        };
                    }
                });
            }
        };
    }]);
