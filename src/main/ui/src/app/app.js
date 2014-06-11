angular.module('stealth', [
    'ngRoute',
    'ngAnimate',
    'ngResource',
    'ui.bootstrap',
    'ui.utils',
    'templates-app',
    'stealth.siterank.siteRank',
    'stealth.targetrank.targetRank'
])

    .config(['$provide', function ($provide) {
        // Config variables are specified in the pom and written to STEALTH.config
        // via scalate. Copy that object as an injectable angular constant here.
        var config = angular.copy(window.STEALTH.config);
        config.userCn = window.STEALTH.userCn;
        $provide.constant('CONFIG', config);
    }])

    .config(['$routeProvider', 'CONFIG', function ($routeProvider, CONFIG) {
        OpenLayers.ImgPath = CONFIG.openlayers.imagePath;

        // Set the default route.
        $routeProvider.otherwise({redirectTo: '/' + CONFIG.app.defaultTab});
    }])

    .controller('AppController', ['$scope', '$rootScope', '$location', 'CONFIG', function ($scope, $rootScope, $location, CONFIG) {
        $rootScope.alert = function (text) {
            alert(text);
        };
        $rootScope.ellipsis = function (text, length) {
            return text.length > length ? text.substr(0, length-3) + '...' : text;
        };

        //Block location changes to disallowed or non-existent routes
        $rootScope.$on('$locationChangeStart', function (event, next, current) {
            if (next.indexOf('#') !== -1 && //route specified AND...
                    !_.some(CONFIG.app.tabs, function (tab) { //route does not lead to allowed tab
                        return (next.indexOf('#/' + tab) > -1);
                    })
                )
            {
                event.preventDefault();
            }
        });

        $scope.app = {
            title: CONFIG.app.title,
            classification: CONFIG.classification,
            userCn: CONFIG.userCn
        };
        $scope.isActiveNavItem = function (viewLocation) {
            return viewLocation === $location.path();
        };
        $scope.showTab = function (tab) {
            return _.contains(CONFIG.app.tabs, tab);
        };
    }]);
