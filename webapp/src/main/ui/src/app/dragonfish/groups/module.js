/**
 * Module for working with groups of entities stored on the server
 * Current compromise UI design lists groups and entities in selected group in left-hand sidebar
 * User can view a graph of the entities in a popup.
 */
angular.module('stealth.dragonfish.groups', [
    'stealth.dragonfish',
    'stealth.dragonfish.groups.sidebar'
])

.constant('stealth.dragonfish.groups.Constant', (function () {
    var entityColors = ['#84b3dd', '#dddb84', '#dd8487', '#b3dd84', '#8487dd'];
    return {
        icon: 'fa-th',
        title: 'Groups Manager',
        panelWidth: 500,
        popupTitle: 'Analyze Group',
        entityColors: entityColors,
        sonicConf: {
            nodeStyle: {
                opacity: 0,
                strokeWidth: 2,
                radius: 4,
                highlightRadiusGrowth: 1,
                label: false,
                colorBy: 'group',
                nodeColors: sonic.colors.colorMap(entityColors)
            },
            linkStyle: {
                stroke: '#ffffff',
                strokeWidth: 1,
                highlightStrokeColor: '#ffffff',
                highlightStrokeWidthGrowth: 1
            }
        }
    };
})())

// Service to put groups in scope for viewer to use
.service('stealth.dragonfish.groups.groupsManager', [
'$interpolate',
'$http',
'$q',
'toastr',
'CONFIG',
'stealth.dragonfish.groups.groupEntity',
'stealth.dragonfish.groups.Constant',
function ($interpolate, $http, $q, toastr, CONFIG, groupEntity, DF_GROUPS) {
    var _self = this;
    this.wktParser = new ol.format.WKT();
    this.listGroupsUrl = $interpolate(
        _.get(CONFIG, 'dragonfish.groups.listGroupsUrl', 'cors/{{geoserverPath}}/dragonfish/listGroups')
    )({
        geoserverPath: CONFIG.geoserver.defaultUrl
    });
    this.getGroups = function () {
        return $http.get(_self.listGroupsUrl)
            .then(
                function (response) {
                    return response.data;
                },
                function () {
                    // toast or otherwise report the error and what, return a $q.reject()
                    toastr.error('Failed to get list of groups from server. Groups Manager is unavailable.', 'Communication Error');
                    return $q.reject('Failed to get list of groups from server');
                }
            );
    };
    this.pickColor = function (subGroup) {
        return DF_GROUPS.entityColors[subGroup % DF_GROUPS.entityColors.length];
    };
    this.getGroupEntities = function (groupId) {
        var groupInfoUrl = $interpolate(
                _.get(CONFIG, 'dragonfish.groups.groupInfoUrl', 'cors/{{geoserverPath}}/dragonfish/groupInfo/{{id}}')
            )({
                id: groupId,
                geoserverPath: CONFIG.geoserver.defaultUrl
            });
        return $http.get(groupInfoUrl)
            .then(
                function (response) {
                    // parse the data if needed and return it
                    var responseData = {
                        entities: _.map(response.data.ents, function (entity) {
                            return groupEntity(entity.id, entity.desc, entity.subgroup, 1.0,
                                _self.wktParser.readGeometry(entity.geom), '', entity.thumbnailURL,
                                '', entity.coordinates.x, entity.coordinates.y, _self.pickColor(entity.subgroup || 0));
                        }),
                        links: _.map(response.data.edges, function (link) {
                            return {
                                source: link.from,
                                target: link.to
                            };
                        })
                    };
                    return responseData;
                },
                function () {
                    // toast or otherwise report the error and return a $q.reject()
                    toastr.error('Failed to get data for group from server.', 'Communication Error');
                    return $q.reject('Failed to get data for group from server.');
                }
            );
    };
}])

.service('stealth.dragonfish.groups.entityGraphBuilder', [
'stealth.dragonfish.groupEntityService',
function (groupEntityService) {
    var _self = this;
    this.groupEntityToSonicData = function (selectedGroup) {
        var maxX = groupEntityService.netX(_.max(selectedGroup.entities, groupEntityService.netX));
        var maxY = groupEntityService.netY(_.max(selectedGroup.entities, groupEntityService.netY));
        var minX = groupEntityService.netX(_.min(selectedGroup.entities, groupEntityService.netX));
        var minY = groupEntityService.netY(_.min(selectedGroup.entities, groupEntityService.netY));
        return {
            key: selectedGroup.id,
            values: _.map(selectedGroup.entities, function (entity) {
                return {
                    id: groupEntityService.id(entity),
                    name: groupEntityService.name(entity),
                    // Set the sonic.js's `group` field so sonic will color the points
                    group: groupEntityService.subGroup(entity),
                    locationOffset: {
                        x: _self.calculateLocationOffset(groupEntityService.netX(entity), minX, maxX),
                        y: (-1 * _self.calculateLocationOffset(groupEntityService.netY(entity), minY, maxY))
                    }
                };
            })
        };
    };
    this.groupLinksToSonicData = function (selectedGroup) {
        return {
            key: 'links' + selectedGroup.id,
            values: selectedGroup.links
        };
    };
    this.calculateLocationOffset = function (value, min, max) {
        if (min === max) {
            // If all points on this axis have the same value they're in a line.
            return 0;
        }
        var ceiling = max - min,
            flooredValue = value - min,
            output = 2 * (flooredValue / ceiling) - 1;
        return output;
    };
}])

/**
 * The closely matching but extending scoredEntity in order to try to reuse some UI code
 * this class adds 2D plotting data
 */
.factory('stealth.dragonfish.groups.groupEntity', [
function () {
    return function (id, name, subGroup, score, geom, time, thumbnailURL, description, netX, netY, color) {
        return new ol.Feature({
            id: id,
            name: name,
            subGroup: subGroup,
            score: score,
            geometry: geom || null, //can crash if given empty string
            time: time,
            thumbnailURL: thumbnailURL,
            description: description,
            netX: netX,
            netY: netY,
            color: color
        });
    };
}])

/**
 * Service for getting properties from GroupEntities.
 * Expects ol.Feature objects
 */
.service('stealth.dragonfish.groupEntityService', [
'stealth.dragonfish.scoredEntityService',
'stealth.dragonfish.groups.groupsManager',
function (scoredEntityService, groupsManager) {
    var _self = this;
    _.merge(_self, scoredEntityService);
    this.netX = function (entity) {return entity.get('netX'); };
    this.netY = function (entity) {return entity.get('netY'); };
    this.subGroup = function (entity) {return entity.get('subGroup') || 0; };
    this.color = function (entity) {return entity.get('color') || groupsManager.pickColor(0); };
}])

.directive('stDfGroupsPopup', [
'$interval',
'stealth.dragonfish.groups.entityGraphBuilder',
'stealth.dragonfish.groups.Constant',
function ($interval, entityGraphBuilder, DF_GROUPS) {
    var link = function (scope, element) {
        var nodes = entityGraphBuilder.groupEntityToSonicData(scope.popupGroup);
        var links = entityGraphBuilder.groupLinksToSonicData(scope.popupGroup);
        var graphDivCheck = $interval(function () {
            var graphDivs = element.children('div.df-popup-graph');
            if (graphDivs.length) {
                $interval.cancel(graphDivCheck);
                scope.viz = sonic.viz(graphDivs[0], [
                    sonic.clone(nodes),
                    sonic.clone(links)
                ]).addNetwork(DF_GROUPS.sonicConf);
            }
        }, 100, 100, false);
        element.on('$destroy', function () {
            $interval.cancel(graphDivCheck);
        });
        element.resizable();
    };
    return {
        restrict: 'E',
        replace: true,
        templateUrl: 'dragonfish/groups/groupPopup.tpl.html',
        link: link
    };
}])
;
