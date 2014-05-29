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
    
    .config(['$routeProvider', '$provide', function ($routeProvider, $provide) {
        // Config variables are specified in the pom and written to STEALTH.config
        // via scalate. Copy that object as an injectable angular constant here.
        var config = angular.copy(window.STEALTH.config);
        $provide.constant('CONFIG', config);
        
        // Set the default route.
        $routeProvider.otherwise({redirectTo: '/targetRank'});
    }])

    .config(['CONFIG', function (CONFIG) {
        OpenLayers.ImgPath = CONFIG.openlayers.imagePath;
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
