angular.module('stealth.app', [
    'ngAnimate',
    'truncate',
    'ui.bootstrap',
    'ui.utils',
    'templates-app',
    'stealth.core',
    'stealth.plugins'
])

.config([
'$provide',
'$httpProvider',
'$logProvider',
function ($provide, $httpProvider, $logProvider) {
    // Config variables are specified in the pom and written to STEALTH.config
    // via scalate. Copy that object as an injectable angular constant here.
    var config = angular.copy(window.STEALTH.config);
    config.userCn = window.STEALTH.userCn;
    $provide.constant('CONFIG', config);

    $httpProvider.defaults.withCredentials = true;

    $logProvider.debugEnabled(false);
    if (config.hasOwnProperty("logger")) {
        if (config.logger.hasOwnProperty("debug")) {
            $logProvider.debugEnabled(config.logger.debug);
        }
    }
}])

.run([
'$log',
'$rootScope',
'CONFIG',
function ($log, $rootScope, CONFIG) {
    $log.debug('stealth.app: run called');
    $rootScope.CONFIG = CONFIG;
}])

.controller('AppController', [
'$log',
'$scope',
'CONFIG',
function ($log, $scope, CONFIG) {
    $log.debug('stealth.app.AppController: controller started');
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
