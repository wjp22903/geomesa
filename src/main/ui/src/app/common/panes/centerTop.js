angular.module('stealth.common.panes.centerTop', [
])

    .directive('centerTop', [function () {
        return {
            restrict: 'E',
            transclude: true,
            scope: {
                isVisible: '=isVisible'
            },
            templateUrl: 'common/panes/centerTop.tpl.html',
            link: function (scope, elem, attrs) {
                scope.toggleVisible = function () {
                    scope.isVisible = !scope.isVisible;
                };
            }
        };
    }]);
