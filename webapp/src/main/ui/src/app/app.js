angular.module('stealth.app', [
    'ngAnimate',
    'truncate',
    'ui.bootstrap',
    'ui.utils',
    'templates-app',
    'stealth.core.geo.ol3.map',
    'stealth.core.geo.ol3.manager',
    'stealth.core.sidebar',
    'stealth.core.utils'
])

.config([
'$httpProvider',
function ($httpProvider) {
    $httpProvider.defaults.withCredentials = true;
}])

.run([
'$rootScope', 'CONFIG',
function ($rootScope, CONFIG) {
    $rootScope.CONFIG = CONFIG;
}])

//Not really a factory, but I don't know how else to create an injectable
//object from $window.
.factory('CONFIG', [
'$window',
function ($window) {
    // Config variables are specified in the pom and written to STEALTH.config
    // via scalate. Copy that object as an injectable angular constant here.
    var config = angular.copy($window.STEALTH.config);
    config.userCn = $window.STEALTH.userCn;
    config.trackStyles = $window.STEALTH.trackStyles;
    return config;
}])

.controller('AppController', [
'$scope', 'CONFIG',
function ($scope, CONFIG) {
    var classBannerHeight = ((_.isEmpty(CONFIG.classification)) ||
                             (_.isEmpty(CONFIG.classification.text) &&
                              _.isEmpty(CONFIG.classification.level))) ? 0 : 15;
    $scope.app = {
        loadTime: moment().format('YYYYMMDDHHmmss'),
        title: CONFIG.app ? (CONFIG.app.title || '') : '',
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
}])
;
