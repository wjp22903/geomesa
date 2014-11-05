angular.module('stealth', [
    'ngAnimate',
    'ui.bootstrap',
    'ui.utils',
    'templates-app',
    'stealth.common.sidebar.sidebar',
    'stealth.common.map.ol3.map'
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

    .controller('AppController', ['$scope', '$rootScope', 'CONFIG', function ($scope, $rootScope, CONFIG) {
        $rootScope.CONFIG = CONFIG;
        $rootScope.alert = function (text) {
            alert(text);
        };
        $rootScope.ellipsis = function (text, length) {
            return ((_.isString(text)) && (text.length > length)) ? text.substr(0, length-3) + '...' : text;
        };

        var classBannerHeight = ((_.isEmpty(CONFIG.classification)) || (_.isEmpty(CONFIG.classification.text) && _.isEmpty(CONFIG.classification.level))) ? 0 : 15;
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
            userCn: CONFIG.userCn
        };
    }]);
