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
                scope.$watch('isFullWidth', function (newVal, oldVal) {
                    if(newVal !== oldVal) {
                        $timeout(function () {
                            element.toggleClass('full-width', newVal === true);
                            $rootScope.$emit("CenterPaneFullWidthChange", newVal);
                        }, newVal === true ? 0 : 500);
                    }
                });
            }
        };
    }]);
