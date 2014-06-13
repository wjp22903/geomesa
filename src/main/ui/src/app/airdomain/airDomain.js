angular.module('stealth.airdomain.airDomain',[])
    .config(['$routeProvider',
        function($routeProvider) {
            $routeProvider.when('/airDomain', {
                templateUrl: 'airdomain/airDomain.tpl.html'
            });
        }
    ])
    .controller('AirDomainController',
        ['$scope', function($scope) {
             $scope.airDomain = {
                 isLeftPaneVisible: false,
                 leftPaneView: 'allTraffic'
             };
             //TODO: Add tracks message passing
        }]
    );