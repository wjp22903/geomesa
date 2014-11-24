angular.module('stealth.core.startmenu', [
    'stealth.core.startmenu.popover',
    'ui.bootstrap'
])

.directive('stStartMenu',
function () {
    return {
        restrict: 'E',
        templateUrl: 'core/startmenu/startmenu.tpl.html',
        replace: true,
        controller: ['$scope', '$window', function ($scope, $window) {
            $scope.show = true;

            var initialClick = function () {
                $scope.$apply(function () {
                    $scope.show = false;
                    $window.removeEventListener('click', initialClick, false);
                });
            };

            $window.addEventListener('click', initialClick, false);
        }]
    };
})
;
