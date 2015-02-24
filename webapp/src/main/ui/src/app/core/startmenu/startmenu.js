angular.module('stealth.core.startmenu', [
    'stealth.core.startmenu.popover',
    'ui.bootstrap'
])

.service('startMenuManager',
function () {
    var _buttons = [],
        _idSeq = 0;

    /**
     * Public API
     */
    this.getButtons = function () {
        return _buttons;
    };

    this.addButton = function (title, iconClass, callBack) {
        var _id = _idSeq++;
        _buttons.push({
            id: _id,
            title: title,
            iconClass: iconClass,
            callBack: callBack
        });
        return _id;
    };

    this.triggerButton = function (id) {
        var button = _.find(_buttons, {id: id});
        if (button) {
            button.callBack();
        }
    };
})

.directive('stStartMenu', [
'startMenuManager',
function (startMenuManager) {
    return {
        restrict: 'E',
        templateUrl: 'core/startmenu/startmenu.tpl.html',
        scope: {},
        controller: ['$scope', '$window', function ($scope, $window) {
            $scope.show = true;
            $scope.manager = startMenuManager;
            $scope.status = {
                isOpen: false
            };

            var initialClick = function () {
                $scope.$evalAsync(function () {
                    $scope.show = false;
                    $window.removeEventListener('click', initialClick, false);
                });
            };

            $window.addEventListener('click', initialClick, false);
        }]
    };
}])
;
