angular.module('stealth.core.geo.ol3.manager', [
    'ui.sortable',
    'stealth.core.sidebar',
    'stealth.core.startmenu',
    'stealth.core.geo.ol3.map'
])

.run([
'$log',
'$rootScope',
'sidebarManager',
'startMenuManager',
'stealth.core.utils.WidgetDef',
function ($log, $rootScope, sidebarManager, startMenuManager, WidgetDef) {
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
'$log',
function ($log) {
    $log.debug('stealth.core.geo.ol3.manager.stOl3ManagerViewSwitcher: directive defined');
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
'$log',
'ol3Map',
function ($log, ol3Map) {
    $log.debug('stealth.core.geo.ol3.manager.stOl3Manager: directive defined');
    return {
        restrict: 'E',
        replace: true,
        scope: {
            view: "="
        },
        templateUrl: 'core/geo/ol3/manager/manager.tpl.html',
        controller: ['$scope', function ($scope) {
            $scope.map = ol3Map;
            $scope.layers = ol3Map.getLayersReversed();
            $scope.sortableOptions = {
                handle: '.dragHandle',
                stop: function (evt, ui) {
                    var sortable = ui.item.sortable;
                    if (sortable && _.isNumber(sortable.dropindex) &&
                            _.isNumber(sortable.index) &&
                            sortable.index != sortable.dropindex) {
                        var lastIndex = $scope.layers.length - 1;
                        ol3Map.moveOl3Layer(lastIndex - sortable.index,
                                            lastIndex - sortable.dropindex);
                    }
                }
            };
        }]
    };
}])

;
