angular.module('stealth.app', [
    'ngAnimate',
    'ngCookies',
    'truncate',
    'ui.bootstrap',
    'ui.utils',
    'toastr',
    'ccri.angular-utils',
    'ccri.bars',
    'templates-app',
    'stealth.core',
    'stealth.plugins',
    'isteven-multi-select'
])

.config([
'$provide',
'$httpProvider',
'$logProvider',
'toastrConfig',
function ($provide, $httpProvider, $logProvider, toastrConfig) {
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

    angular.extend(toastrConfig, {
        target: '.primaryDisplay',
        positionClass: 'toast-bottom-right',
        closeButton: true,
        progressBar: true,
        timeOut: 5000,
        extendedTimeOut: 5000
    });
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
'$timeout',
'$document',
'CONFIG',
function ($log, $scope, $timeout, $document, CONFIG) {
    $log.debug('stealth.app.AppController: controller started');
    $scope.app = {
        loadTime: moment().format('YYYYMMDDHHmmss'),
        title: _.get(CONFIG, 'app.title', ''),
        classification: CONFIG.classification,
        userCn: CONFIG.userCn
    };

    if (CONFIG.app.showSplash) {
        $scope.dismissSplash = function () {
            $('#splash').remove();
            $document.off('keydown', $scope.dismissSplash);
            delete $scope.splashDismissButton;
            delete $scope.dismissSplash;
        };
        $timeout(function () {
            $scope.splashDismissButton = {
                opacity: 1
            };
        }, 2000);
        $document.one('keydown', $scope.dismissSplash);
    }
}])
;
