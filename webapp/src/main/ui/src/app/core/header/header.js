angular.module('stealth.core.header', [
    'stealth.core.startmenu'
])

.directive('stHeader', function () {
    return {
        restrict: 'E',
        replace: true,
        templateUrl: 'core/header/header.tpl.html',
        controller: ['$scope', 'CONFIG', function ($scope, CONFIG) {
            $scope.userCn = CONFIG.userCn;
            $scope.title = CONFIG.app.title;
        }]
    };
})
;
