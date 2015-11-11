angular.module('stealth.dragonfish.groups.sidebar', [
    'stealth.dragonfish',
    'stealth.core.sidebar'
])

.run([
'$rootScope',
'sidebarManager',
'stealth.core.utils.WidgetDef',
'stealth.dragonfish.groups.Constant',
function ($rootScope, sidebarManager, WidgetDef, DF_GROUPS) {
    sidebarManager.addButton(DF_GROUPS.title, DF_GROUPS.icon, DF_GROUPS.panelWidth,
                             new WidgetDef('st-df-groups-sidebar', $rootScope.$new()),
                             undefined,
                             true);
}])

.directive('stDfGroupsSidebar', [
'$log',
'stealth.dragonfish.groups.groupsManager',
'stealth.dragonfish.scoredEntityService',
'stealth.dragonfish.geo.ol3.layers.styler',
function ($log, groupsManager, scoredEntityService, entityStyler) {
    $log.debug('stealth.dragonfish.groups.sidebar.stDfGroupsSidebar: directive defined');
    return {
        restrict: 'E',
        replace: true,
        templateUrl: 'dragonfish/groups/sidebar/viewer.tpl.html',
        controller: ['$scope', function ($scope) {
            $scope.groups = groupsManager.getGroups();
            $scope.scoredEntityService = scoredEntityService;
            $scope.getEntityColor = function (result) {
                return entityStyler.getColorByScore($scope.scoredEntityService.score(result), 0.0);
            };
            $scope.selectedGroup = 'none';
            $scope.setGroup = function (group) {
                $scope.selectedGroup = group;
            };
        }]
    };
}])
;
