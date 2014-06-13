angular.module('stealth.common.panes.centerPane', [
])

    .directive('centerPane', ['$timeout', '$rootScope', function ($timeout, $rootScope) {
        return {
            restrict: 'E',
            transclude: true,
            scope: {
                isFullWidth: '='
            },
            template: '<div ng-transclude></div>',
            link: function (scope, element, attrs) {
                var setFullWidth = function (full) {
                    $timeout(function () {
                        element.toggleClass('full-width', full);
                        $rootScope.$emit("CenterPaneFullWidthChange", full);
                    }, full ? 0 : 500);
                };
                setFullWidth(scope.isFullWidth);
                scope.$watch('isFullWidth', function (newVal, oldVal) {
                    if(newVal !== oldVal) {
                        setFullWidth(newVal);
                    }
                });
            }
        };
    }]);
