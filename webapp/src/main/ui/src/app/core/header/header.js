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
'toastr',
'headerManager',
'CONFIG',
function (toastr, manager, CONFIG) {
    return {
        restrict: 'E',
        scope: {},
        templateUrl: 'core/header/header.tpl.html',
        controller: ['$scope', function ($scope) {
            $scope.userCn = CONFIG.userCn;
            $scope.logoUrl = 'assets/logo.png?' + CONFIG.app.loadTime;
            $scope.title = CONFIG.app.title;
            $scope.manager = manager;
            var noTimeout = {timeOut: 0};
            var currentBrowser = _.find(_.keys(CONFIG.app.browsers), function (browserType) {
                return bowser[browserType];
            });
            if (currentBrowser) {
                if (bowser.version < currentBrowser.minVersion) {
                    toastr.error($scope.title + ' requires ' + currentBrowser.name +
                                  ' version ' + currentBrowser.minVersion + ' or higher. ' +
                                  $scope.title + ' may not function properly, please upgrade your browser.', 'Unsupported Version', noTimeout);
                } else if (currentBrowser.maxVersion && bowser.version > currentBrowser.maxVersion) {
                    toastr.error($scope.title + ' requires ' + currentBrowser.name +
                                  ' version between ' + currentBrowser.minVersion + ' and ' + currentBrowser.maxVersion + '. ' +
                                  $scope.title + ' may not function properly, please downgrade your browser.', 'Unsupported Version', noTimeout);
                }
                if (_.isArray(currentBrowser.preferred) && !_.isEmpty(currentBrowser.preferred)) {
                    toastr.warning($scope.title + ' is best viewed with ' + currentBrowser.preferred.join(' or ') + '.', 'Browser Warning', {timeOut: 15000});
                }
            } else {
                toastr.error($scope.title + ' does not support ' + bowser.name.toUpperCase() +
                              '. Please use one of the following supported browsers: ' + _.pluck(CONFIG.app.browsers, 'name').join() + '.', 'Unsupported Browser', noTimeout);
            }
        }]
    };
}])
;
