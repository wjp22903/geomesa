angular.module('stealth', [
    'ngRoute',
    'ngAnimate',
    'ngResource',
    'ui.bootstrap',
    'templates-app',
    'stealth.siteactivity.siteActivity',
    'stealth.targetwatch.targetWatch'
])

    .config(['$routeProvider', function ($routeProvider) {
        // Configure route provider to transform any undefined hashes to /home.
        $routeProvider.otherwise({redirectTo: '/siteactivity'});
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
