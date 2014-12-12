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
'headerManager',
'CONFIG',
function (manager, CONFIG) {
    return {
        restrict: 'E',
        scope: {},
        templateUrl: 'core/header/header.tpl.html',
        controller: ['$scope', function ($scope) {
            $scope.userCn = CONFIG.userCn;
            $scope.logoUrl = 'assets/logo.png?' + CONFIG.app.loadTime;
            $scope.title = CONFIG.app.title;
            $scope.manager = manager;
        }]
    };
}])
;
