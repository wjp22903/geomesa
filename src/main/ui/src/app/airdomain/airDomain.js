angular.module('stealth.airdomain.airDomain',[])
    .config(['$routeProvider',
        function($routeProvider) {
            $routeProvider.when('/airDomain', {
                templateUrl: 'airdomain/airDomain.tpl.html'
            });
        }
    ])
    .controller('AirDomainController', ['$scope', '$sce', 'CONFIG', function ($scope, $sce, CONFIG) {
        $scope.frameUrl = $sce.trustAsResourceUrl(CONFIG.whiptail.url);
    }])
;
