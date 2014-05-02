angular.module('stealth.common.panes.leftPane', [
])

    .directive('leftPane', [function () {
        return {
            restrict: 'E',
            transclude: true,
            scope: {
                isVisible: '=isVisible'
            },
            templateUrl: 'common/panes/leftPane.tpl.html',
            link: function (scope, elem, attrs) {
                scope.toggleVisible = function () {
                    scope.isVisible = !scope.isVisible;
                };
            }
        };
    }]);
