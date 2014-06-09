angular.module('stealth.siterank.siteRank', [
])

    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/siteRank', {
            templateUrl: 'siterank/siteRank.tpl.html'
        });
    }])

    .controller('SiteRankController', ['$scope', function($scope) {
        $scope.siteRank = {
            isLeftPaneVisible: true
        };
    }]);
