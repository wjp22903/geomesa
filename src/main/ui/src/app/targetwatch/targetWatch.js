angular.module('stealth.targetwatch.targetWatch', [
    'stealth.common.map.leafletMap',
    'stealth.common.panes.centerPane',
    'stealth.common.panes.leftPane',
    'stealth.common.panes.centerTop',
    'stealth.common.panes.centerRight'
])

    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/targetwatch', {
            templateUrl: 'targetwatch/targetWatch.tpl.html',
            controller: 'TargetWatchController'
        });
    }])

    .controller('TargetWatchController', ['$scope', function($scope) {
        $scope.isLeftPaneVisible = true;
        $scope.isCenterTopVisible = true;
        $scope.isCenterRightVisible = true;
    }]);
