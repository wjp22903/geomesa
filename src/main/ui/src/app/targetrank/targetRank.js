angular.module('stealth.targetrank.targetRank', [
    'stealth.common.map.openlayersMap',
    'stealth.common.panes.centerPane',
    'stealth.common.panes.leftPane',
    'stealth.common.panes.centerTop',
    'stealth.common.panes.centerRight',
    'stealth.targetrank.leftNav'
])

    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/targetRank', {
            templateUrl: 'targetrank/targetRank.tpl.html'
        });
    }])

    .controller('TargetRankController', ['$scope', '$rootScope', '$modal', '$http', function($scope, $rootScope, $modal, $http) {
        $scope.targetRank = {
            isLeftPaneVisible: true,
            leftPaneView: 'analysis',
            numSites: 0,
            numData: 0,
            numTargets: 0,
            sites: [{properties: {STATE_NAME: '(none)'}}]
        };

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
                    templateUrl: 'targetrank/addSitesForm.tpl.html',
                    controller: function ($scope, $modalInstance) {
                        $scope.addSites.submit = function () {
                            var cql_filter = $scope.addSites.formData.cql_filter;
                            $http.get('cors/http://localhost:8081/geoserver/wfs', {params: $scope.addSites.formData})
                                .success(function (data) {
                                    $modalInstance.close();
                                    $rootScope.$broadcast("AddWmsMapLayer", {
                                        name: 'Sites',
                                        url: 'http://localhost:8081/geoserver/wms',
                                        layers: ['topp:states'],
                                        cql_filter: cql_filter
                                    });
                                    $scope.$parent.targetRank.numSites += data.totalFeatures;
                                    $scope.$parent.targetRank.sites = data.features;
                                });
                        };
                        $scope.addSites.cancel = function () {
                            $modalInstance.dismiss('cancel');
                        };
                    }
                });
            }
        };
    }]);
