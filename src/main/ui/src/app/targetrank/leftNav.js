angular.module('stealth.targetrank.leftNav', [
])

    .directive('trLeftNav', [function () {
        return {
            restrict: 'E',
            templateUrl: 'targetrank/leftNav.tpl.html'
        };
    }]);