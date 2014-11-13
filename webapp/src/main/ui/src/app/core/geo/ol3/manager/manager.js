angular.module('stealth.core.geo.ol3.manager', [
    'stealth.core.geo.ol3.map',
    'stealth.core.sidebar',
    'stealth.core.utils'
])

.run([
'$rootScope', 'sidebarManager',
function ($rootScope, sidebarManager) {
    var panelScope = $rootScope.$new();
    panelScope.view = 'explore'; //default view
    sidebarManager.addButton('Map Manager', 'fa-globe', 350,
                             'st-ol3-manager', panelScope,
                             'st-ol3-manager-view-switcher', panelScope, true);
}])

.directive('stOl3ManagerViewSwitcher', [
function () {
    return {
        restrict: 'E',
        replace: true,
        template: '<div class="btn-group ol3ManagerViewSwitcher">\
                       <label class="btn btn-default" ng-model="view" btn-radio="\'explore\'">Explore</label>\
                       <label class="btn btn-default" ng-model="view" btn-radio="\'style\'">Style</label>\
                   </div>'
    };
}])

.directive('stOl3Manager', [
'ol3Map',
function (ol3Map) {
    return {
        restrict: 'E',
        replace: true,
        templateUrl: 'core/geo/ol3/manager/manager.tpl.html',
        controller: ['$scope', function ($scope) {
            $scope.map = ol3Map;
        }]
    };
}])
;
