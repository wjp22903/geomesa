angular.module('stealth.core.header', [
    'stealth.core.startmenu'
])

.service('headerManager', [
function () {
    var _visible = true;
    this.getVisible = function () { return _visible; };
    this.setVisible = function (visible) { _visible = visible; };
}])

.directive('stHeader', [
'toaster',
'headerManager',
'CONFIG',
function (toaster, manager, CONFIG) {
    return {
        restrict: 'E',
        scope: {},
        templateUrl: 'core/header/header.tpl.html',
        controller: ['$scope', function ($scope) {
            $scope.userCn = CONFIG.userCn;
            $scope.logoUrl = 'assets/logo.png?' + CONFIG.app.loadTime;
            $scope.title = CONFIG.app.title;
            $scope.manager = manager;
            var currentBrowser = _.find(CONFIG.app.browsers, function (browserInfo, browserType) {
                return bowser[browserType];
            });
            if (currentBrowser) {
                if (bowser.version < currentBrowser.minVersion) {
                    toaster.error('Unsupported Version', $scope.title + ' requires ' + currentBrowser.name +
                                  ' version ' + currentBrowser.minVersion + ' or higher. ' +
                                  $scope.title + ' may not function properly, please upgrade your browser.', 0);
                } else if (currentBrowser.maxVersion && bowser.version > currentBrowser.maxVersion) {
                    toaster.error('Unsupported Version', $scope.title + ' requires ' + currentBrowser.name +
                                  ' version between ' + currentBrowser.minVersion + ' and ' + currentBrowser.maxVersion + '. ' +
                                  $scope.title + ' may not function properly, please downgrade your browser.', 0);
                }
                if (_.isArray(currentBrowser.preferred) && !_.isEmpty(currentBrowser.preferred)) {
                    toaster.warning('Browser Warning', $scope.title + ' is best viewed with ' + currentBrowser.preferred.join(' or ') + '.', 15000);
                }
            } else {
                toaster.error('Unsupported Browser', $scope.title + ' does not support ' + bowser.name.toUpperCase() +
                              '. Please use one of the following supported browsers: ' + _.pluck(CONFIG.app.browsers, 'name').join() + '.', 0);
            }
        }]
    };
}])
;
