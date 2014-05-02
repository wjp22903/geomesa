angular.module('stealth.common.panes.centerRight', [
])

    .directive('centerRight', [function () {
        return {
            restrict: 'E',
            transclude: true,
            scope: {
                isVisible: '=isVisible'
            },
            templateUrl: 'common/panes/centerRight.tpl.html',
            link: function (scope, elem, attrs) {
                scope.toggleVisible = function () {
                    scope.isVisible = !scope.isVisible;
                };
            }
        };
    }]);
