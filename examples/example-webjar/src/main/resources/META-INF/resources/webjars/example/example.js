angular.module('stealth.example', [
    'stealth.core.sidebar',
    'stealth.core.utils'
])

.run([
'sidebarManager',
'stealth.core.utils.WidgetDef',
function (sidebarManager, WidgetDef) {
    var sidebarId = sidebarManager.toggleButton(sidebarManager.addButton('Example Plugin', 'fa-hand-peace-o', 300,
        new WidgetDef('st-example-sidebar-panel')), true);
}])

.directive('stExampleSidebarPanel', [
function () {
    return {
        restrict: 'E',
        scope: {},
        templateUrl: 'example/sidebar.tpl.html'
    };
}])
;
