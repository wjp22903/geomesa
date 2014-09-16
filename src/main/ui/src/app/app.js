angular.module('stealth', [
    'ngRoute',
    'ngAnimate',
    'ngResource',
    'ui.bootstrap',
    'ui.utils',
    'templates-app',
    'stealth.siterank.siteRank',
    'stealth.targetrank.targetRank',
    'stealth.airdomain.airDomain'
])

    .config(['$provide', '$httpProvider', function ($provide, $httpProvider) {
        // Config variables are specified in the pom and written to STEALTH.config
        // via scalate. Copy that object as an injectable angular constant here.
        var config = angular.copy(window.STEALTH.config);
        config.userCn = window.STEALTH.userCn;
        config.trackStyles = window.STEALTH.trackStyles;
        $provide.constant('CONFIG', config);
        $httpProvider.defaults.withCredentials = true;
    }])

    .config(['$routeProvider', 'CONFIG', function ($routeProvider, CONFIG) {
        OpenLayers.ImgPath = CONFIG.openlayers.imagePath;

        // Set the default route.
        $routeProvider.otherwise({redirectTo: '/' + CONFIG.app.defaultTab});
    }])

    .controller('AppController', ['$scope', '$rootScope', '$location', 'CONFIG', function ($scope, $rootScope, $location, CONFIG) {
        $rootScope.CONFIG = CONFIG;
        $rootScope.alert = function (text) {
            alert(text);
        };
        $rootScope.ellipsis = function (text, length) {
            return ((_.isString(text)) && (text.length > length)) ? text.substr(0, length-3) + '...' : text;
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

        var classBannerHeight = ((_.isEmpty(CONFIG.classification)) || (_.isEmpty(CONFIG.classification.text) && _.isEmpty(CONFIG.classification.level))) ? 0 : 15,
            navBarHeight = CONFIG.app.hideNavBar ? 0 : 50;
        $scope.app = {
            loadTime: moment().format('YYYYMMDDHHmmss'),
            title: CONFIG.app.title,
            classification: CONFIG.classification,
            classBannerStyle: {
                height: classBannerHeight + 'px'
            },
            betweenClassBannersStyle: {
                top: classBannerHeight + 'px',
                bottom: classBannerHeight + 'px'
            },
            viewStyle: {
                top: navBarHeight + 'px'
            },
            userCn: CONFIG.userCn
        };
        $scope.isActiveNavItem = function (viewLocation) {
            return viewLocation === $location.path();
        };
        $scope.showTab = function (tab) {
            return _.contains(CONFIG.app.tabs, tab);
        };
    }]);
