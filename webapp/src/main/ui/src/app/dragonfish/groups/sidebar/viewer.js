angular.module('stealth.dragonfish.groups.sidebar', [
    'stealth.dragonfish',
    'stealth.core.sidebar'
])

.run([
'categoryManager',
'CONFIG',
'ol3Map',
'sidebarManager',
'stealth.core.geo.analysis.category.AnalysisCategory',
'stealth.core.popup.popupManager',
'stealth.core.utils.WidgetDef',
'stealth.dragonfish.groups.Constant',
'stealth.dragonfish.groups.groupsManager',
'stealth.dragonfish.Constant',
'stealth.dragonfish.scoredEntityService',
'stealth.dragonfish.geo.ol3.layers.styler',
'stealth.dragonfish.groupEntityService',
'stealth.dragonfish.geo.ol3.layers.EntityLayer',
'stealth.dragonfish.sidebarService',
function (catMgr, CONFIG, ol3Map, sidebarManager, AnalysisCategory, popupManager, WidgetDef, DF_GROUPS,
          groupsManager, DF, scoredEntityService, entityStyler, groupEntityService, EntityLayer, sidebarService) {
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
    scope.popupWin = _.get(CONFIG, 'dragonfish.popupWin', {height: 200, width: 300});
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
                offsetX: (10 * scope.popupOffset) + (DF_GROUPS.panelWidth / 2) + (scope.popupWin.width / 2),
                offsetY: (10 * scope.popupOffset) + (scope.popupWin.height / 2)
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
    scope.updateMap = function () {
        if (scope.entityLayer) {
            scope.entityLayer.updateMap();
        }
    };
    // create map manager category if needed
    if (!scope.category) {
        scope.category = catMgr.addCategory(2, new AnalysisCategory(DF_GROUPS.title, DF.icon));
    }
    scope.loadMap = function () {
        var layerExists = false;
        // hide all layers except currently selected one
        _.each(scope.groups, function (group) {
            if (group.layerId && ol3Map.getLayerById(group.layerId)) {
                var thisLayer = ol3Map.getLayerById(group.layerId);
                if (group.layerId === scope.selectedGroup.layerId) {
                    thisLayer.ol3Layer.setVisible(true);
                    layerExists = true;
                    ol3Map.fit(thisLayer.getExtent());
                } else {
                    thisLayer.ol3Layer.setVisible(false);
                }
            }
        });

        // create map manager category if needed
        if (!scope.category) {
            scope.category = catMgr.addCategory(2, new AnalysisCategory(DF_GROUPS.title, DF.icon));
        }
        // populate the map if the layer isn't already in the list.
        if (!layerExists && !_.isEmpty(scope.selectedGroup.entities)) {
            var newLayer = new EntityLayer({
                queryable: true,
                name: "Entities in " + scope.selectedGroup.name,
                features: scope.selectedGroup.entities,
                categoryId: scope.category.id
            });
            scope.entityLayer = newLayer;
            scope.selectedGroup.layerId = newLayer.getId();
            newLayer.viewState = {};
            newLayer.ol3Layer.setStyle(entityStyler.groupCurriedStyleFunction(newLayer.viewState));
            scope.category.addLayer(newLayer);
            ol3Map.fit(newLayer.getExtent());
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
