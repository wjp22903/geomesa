angular.module('stealth.dragonfish.groups.sidebar', [
    'stealth.dragonfish',
    'stealth.core.sidebar'
])

.run([
'categoryManager',
'ol3Map',
'sidebarManager',
'stealth.core.geo.analysis.category.AnalysisCategory',
'stealth.core.popup.popupManager',
'stealth.core.utils.WidgetDef',
'stealth.dragonfish.groups.Constant',
'stealth.dragonfish.groups.groupsManager',
'stealth.dragonfish.Constant',
'stealth.dragonfish.scoredEntityService',
'stealth.dragonfish.groupEntityService',
'stealth.dragonfish.geo.ol3.layers.EntityLayer',
'stealth.dragonfish.sidebarService',
function (catMgr, ol3Map, sidebarManager, AnalysisCategory, popupManager, WidgetDef, DF_GROUPS,
          groupsManager, DF, scoredEntityService, groupEntityService, EntityLayer, sidebarService) {
    var scope = sidebarService.createScope();
    scope.popupOffset = 0;
    sidebarManager.addButton(DF_GROUPS.title, DF_GROUPS.icon, DF_GROUPS.panelWidth,
                             new WidgetDef('st-df-groups-sidebar', scope),
                             new WidgetDef('st-pager', scope, "paging='paging' records='selectedGroup.entities'"),
                             true);
    groupsManager.getGroups().then(function (groups) {
        scope.groups = groups;
    });
    scope.scoredEntityService = scoredEntityService;
    scope.groupEntityService = groupEntityService;
    scope.selectedGroup = {};
    scope.setGroup = function (group) {
        if (!group.entities) {
            groupsManager.getGroupEntities(group.id).then(function (groupData) {
                group.entities = groupData.entities;
                group.links = groupData.links;
                scope.selectedGroup = group;
            });
        } else {
            scope.selectedGroup = group;
        }
    };
    scope.DF_GROUPS = DF_GROUPS;
    scope.buttonTitle = DF_GROUPS.popupTitle;
    scope.analyzeEmbeddings = function (popupGroup) {
        if (scope.selectedGroup.entities.length > 0) {
            var popupScope = scope.$new();
            popupScope.popupGroup = popupGroup;
            var contentDef = new WidgetDef('st-df-groups-popup', popupScope);
            if (scope.popupId !== undefined) {
                scope.popupOffset++;
            }
            scope.popupId = popupManager.displayPopup(scope.buttonTitle + ' (t-SNE)', DF_GROUPS.icon, contentDef, {
                positioning: 'center',
                offsetX: (10 * scope.popupOffset),
                offsetY: (10 * scope.popupOffset)
            });
        }
    };
    scope.$watch('selectedGroup', function () {
        // reset paging
        scope.paging.currentPage = 1;
        scope.paging.suggestedPage = 1;
        // swap out what's on the map
        scope.loadMap();
    });
    scope.loadMap = function () {
        // clear out old map layer:
        if (scope.category) {
            catMgr.removeCategory(scope.category.id);
        }
        // populate the map
        scope.category = catMgr.addCategory(2, new AnalysisCategory(scope.buttonTitle, DF.icon));
        if (!_.isEmpty(scope.selectedGroup.entities)) {
            scope.entityLayer = new EntityLayer({
                queryable: true,
                name: scope.buttonTitle,
                features: scope.selectedGroup.entities,
                categoryId: scope.category.id
            });
            scope.updateMap = function () {
                scope.entityLayer.updateMap();
            };
            scope.category.addLayer(scope.entityLayer);
            ol3Map.fit(scope.entityLayer.getExtent());
        }
    };
}])

.directive('stDfGroupsSidebar', [
'$log',
function ($log) {
    $log.debug('stealth.dragonfish.groups.sidebar.stDfGroupsSidebar: directive defined');
    return {
        restrict: 'E',
        replace: true,
        templateUrl: 'dragonfish/groups/sidebar/viewer.tpl.html'
    };
}])
;
