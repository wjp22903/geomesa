/**
 * Module for working with groups of entities stored on the server
 * Current compromise UI design lists groups and entities in selected group in left-hand sidebar
 * User can view a graph of the entities in a popup.
 */
angular.module('stealth.dragonfish.groups', [
    'stealth.dragonfish',
    'stealth.dragonfish.groups.sidebar'
])

.constant('stealth.dragonfish.groups.Constant', {
    icon: 'fa-th',
    title: 'Groups Manager',
    panelWidth: 400,
    sonicMargin: {
        top: 10,
        right: 10,
        bottom: -30,
        left: -40
    },
    popupTitle: 'Analyze Embeddings'
})

// Service to put groups in scope for viewer to use
.service('stealth.dragonfish.groups.groupsManager', [
'CONFIG',
'stealth.dragonfish.groups.groupEntity',
function (CONFIG, groupEntity) {
    this.getGroups = function () {
        var parsedGroups = _.get(CONFIG, 'dragonfish.groups', []);
        _.map(parsedGroups, function (group) {
            group.entities = _.map(group.entities, function (entity) {
                return groupEntity(entity.id, entity.name, entity.score,
                    new ol.geom.Polygon(entity.geom),
                    '', '', '', entity.netX, entity.netY);
            });
        });
        return parsedGroups;
    };
}])

.service('stealth.dragonfish.groups.entityGraphBuilder', [
'stealth.dragonfish.groupEntityService',
function (groupEntityService) {
    this.groupEntityToSonicData = function (selectedGroup) {
        var sonicData = [{
            key: selectedGroup.id,
            color: 'black',
            values: _.map(selectedGroup.entities, function (entity) {
                return {
                    id: groupEntityService.id(entity),
                    x: groupEntityService.netX(entity),
                    y: groupEntityService.netY(entity)
                };
            })
        }];
        return sonicData;
    };
}])

/**
 * The closely matching but extending scoredEntity in order to try to reuse some UI code
 * this class adds 2D plotting data
 */
.factory('stealth.dragonfish.groups.groupEntity', [
function () {
    return function (id, name, score, geom, time, thumbnail, description, netX, netY) {
        return new ol.Feature({
            id: id,
            name: name,
            score: score,
            geometry: geom || null, //can crash if given empty string
            time: time,
            thumbnail: thumbnail,
            description: description,
            netX: netX,
            netY: netY
        });
    };
}])

/**
 * Service for getting properties from GroupEntities.
 * Expects ol.Feature objects
 */
.service('stealth.dragonfish.groupEntityService', [
'stealth.dragonfish.scoredEntityService',
function (scoredEntityService) {
    var _self = this;
    _.merge(_self, scoredEntityService);
    this.netX = function (entity) {return entity.get('netX'); };
    this.netY = function (entity) {return entity.get('netY'); };
}])

.directive('stDfGroupsPopup', [
'$timeout',
'stealth.dragonfish.groups.entityGraphBuilder',
'stealth.dragonfish.groups.Constant',
function ($timeout, entityGraphBuilder, DF_GROUPS) {
    var link = function (scope) {
        var vizDiv = '#' + scope.popupGroup.id + scope.popupOffset;
        $timeout(function () {
            sonic.viz(angular.element(vizDiv)[0], entityGraphBuilder.groupEntityToSonicData(scope.popupGroup), {
                margin: DF_GROUPS.sonicMargin
            })
            .addXAxis({
                ticks: false,
                range: [0.05, 0.8]
            })
            .addYAxis({
                ticks: false,
                range: [0.1, 0.95]
            })
            .addPoints({
                type: 'circle',
                stroke: '#000',
                fillOpacity: 0,
                size: 49,
                tooltip: {
                    buffer: {
                        type: 'pixel',
                        amount: 5
                    }
                },
                highlightLabel: { // this is in the sonic.js examples but is ignored here
                    labelGenFn: function (p) {
                        return p.name;
                    }
                }
            });
        }, 1000);
    };
    return {
        restrict: 'E',
        replace: true,
        templateUrl: 'dragonfish/groups/groupPopup.tpl.html',
        link: link
    };
}])
;
