angular.module('stealth.siteactivity.leftNav', [
])

    .directive('saLeftNav', [function () {
        return {
            restrict: 'E',
            templateUrl: 'siteactivity/leftNav.tpl.html'
        };
    }]);