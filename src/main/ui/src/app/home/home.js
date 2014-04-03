angular.module('stealth.home', [
    'stealth.leafletMap'
])
    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/home', {
            templateUrl: 'home/home.tpl.html',
            controller: 'HomeController'
        });
    }])

    .controller('HomeController', ['$scope', 'MapService', function($scope, MapService) {
        $scope.sites = [];
        $scope.layers = ['geomesa:ds_sites0', 'geomesa:ds_sites2'];

        $scope.addSite = function (layername) {
            $scope.sites.push({name: layername});
            MapService.addLayer($scope, {
                url: $scope.mc.url,
                layers: [layername]
            });
            $scope.showSiteWizard=false;
        };
    }]);
