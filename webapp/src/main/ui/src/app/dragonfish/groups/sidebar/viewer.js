angular.module('stealth.dragonfish.groups.sidebar', [
    'stealth.dragonfish',
    'stealth.core.sidebar'
])

.run([
'$rootScope',
'sidebarManager',
'stealth.core.popup.popupManager',
'stealth.core.utils.WidgetDef',
'stealth.dragonfish.groups.Constant',
function ($rootScope, sidebarManager, popupManager, WidgetDef, DF_GROUPS) {
    var scope = $rootScope.$new();
    scope.popupOffset = 0;
    sidebarManager.addButton(DF_GROUPS.title, DF_GROUPS.icon, 400,
                             new WidgetDef('st-df-groups-sidebar', scope),
                             undefined,
                             true);
    scope.analyzeEmbeddings = function (popupGroup) {
        if (scope.selectedGroup.entities.length > 0) {
            var popupScope = scope.$new();
            popupScope.popupGroup = popupGroup;
            var contentDef = new WidgetDef('st-df-groups-popup', popupScope);
            if (scope.popupId !== undefined) {
                scope.popupOffset++;
            }
            scope.popupId = popupManager.displayPopup(DF_GROUPS.popupTitle, DF_GROUPS.icon, contentDef, {
                positioning: 'center',
                offsetX: (10 * scope.popupOffset),
                offsetY: (10 * scope.popupOffset)
            });
        }
    };
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
