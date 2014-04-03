angular.module('stealth', [
    'ngRoute',
    'ngAnimate',
    'ngResource',
    'ui.bootstrap',
    'templates-app',
    'stealth.home',
    'stealth.leafletMap'
])
    .config(['$routeProvider', function ($routeProvider) {
        // Configure route provider to transform any undefined hashes to /home.
        $routeProvider.otherwise({redirectTo: '/home'});
    }])

    .constant('appInfo', {
        name: 'stealth',
        title: 'Stealth'
    })

    .controller('AppController', ['$scope', 'appInfo', function ($scope, appInfo) {
        $scope.appModel = {
            appName: appInfo.name,
            appTitle: appInfo.title
        };
    }]);
