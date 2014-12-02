angular.module('stealth.core.geo.ol3.manager', [
    'stealth.core.geo.ol3.map',
    'stealth.core.sidebar',
    'stealth.core.startmenu',
    'stealth.core.utils'
])

.run([
'$rootScope', 'sidebarManager', 'startMenuManager', 'WidgetDef',
function ($rootScope, sidebarManager, startMenuManager, WidgetDef) {
    var panelScope = $rootScope.$new();
    panelScope.view = 'explore'; //default view
    var sidebarId = sidebarManager.addButton('Map Manager', 'fa-globe', 350,
        new WidgetDef('st-ol3-manager', panelScope, "view='view'"),
        new WidgetDef('st-ol3-manager-view-switcher', panelScope, "view='view'"),
        true);
    startMenuManager.addButton('Map Manager', 'fa-globe', function () {
        sidebarManager.toggleButton(sidebarId, true);
    });
}])

.directive('stOl3ManagerViewSwitcher', [
function () {
    return {
        restrict: 'E',
        replace: true,
        scope:{
            view: "="
        },
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
        scope: {
            view: "="
        },
        templateUrl: 'core/geo/ol3/manager/manager.tpl.html',
        controller: ['$scope', function ($scope) {
            $scope.map = ol3Map;
        }]
    };
}])
;
