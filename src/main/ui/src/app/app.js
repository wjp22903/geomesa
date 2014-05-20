angular.module('stealth', [
    'ngRoute',
    'ngAnimate',
    'ngResource',
    'ui.bootstrap',
    'templates-app',
    'stealth.siterank.siteRank',
    'stealth.targetrank.targetRank',
    'stealth.wps.wps'
])

    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider.otherwise({redirectTo: '/targetRank'});
    }])

    .constant('appInfo', {
        name: 'stealth',
        title: 'Stealth'
    })

    .controller('AppController', ['$scope', '$rootScope', '$location', 'appInfo', function ($scope, $rootScope, $location, appInfo) {
        $rootScope.alert = function(text) {
            alert(text);
        };

        $scope.appModel = {
            appName: appInfo.name,
            appTitle: appInfo.title
        };
        $scope.isActiveNavItem = function (viewLocation) {
            return viewLocation === $location.path();
        };
    }]);
