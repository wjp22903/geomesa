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
        },
        // Entities in the group panel will be sorted by the following fields, in the (reverse of the) order specified.
        // Matches in one field are sorted by the next field. See [_.sortByOrder](https://lodash.com/docs#sortByOrder).
        // This can be overridden with CONFIG.dragonfish.groups.panelSort.
        panelSort: {
            fields: ['startTime', 'name', 'desc'],
            orders: ['asc', 'desc', 'desc'] // note that these should actually be the reverse of what you want
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
                    // Convert raw response to well-formed entities, in a nice order, with assigned subgroups/colors.
                    // Note that the order looks backwards here, as it seemed to get flipped somewhere before it
                    // makes it to the list panel. We re-assign subgroups to ensure the values begin at 0 and increment,
                    // to help ensure colors match between the panel, map, and tSNE plot.
                    var sortFields = _.get(CONFIG, 'dragonfish.groups.panelSort.fields', DF_GROUPS.panelSort.fields);
                    var sortOrders = _.get(CONFIG, 'dragonfish.groups.panelSort.orders', DF_GROUPS.panelSort.orders);
                    var sorted = _.sortByOrder(response.data.ents, sortFields, sortOrders);
                    var subgroupReduce = {}; // map from given subgroup to 0-based, 1-incrementing, subgroup values
                    var numSubgroups = 0;
                    var entities = _.map(sorted, function (entity) {
                        var givenSubgroup = entity.subgroup;
                        if (!subgroupReduce.hasOwnProperty(givenSubgroup)) {
                            subgroupReduce[givenSubgroup] = numSubgroups;
                            numSubgroups += 1;
                        }
                        var subgroup = subgroupReduce[givenSubgroup];
                        var ent = groupEntity(
                            entity.id, // id
                            entity.desc, // name
                            subgroup, // subgroup
                            1.0, // score
                            _self.wktParser.readGeometry(entity.geom), // geom
                            '', // time
                            entity.thumbnailURL, // thumbnail
                            '', // description
                            entity.coordinates.x, // netX
                            entity.coordinates.y, // netY
                            _self.pickColor(subgroup || 0) // color
                        );
                        return ent;
                    });
                    var responseData = {
                        entities: entities,
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
    this.groupEntityToSonicData = function (selectedGroup, cmap) {
        var maxX = groupEntityService.netX(_.max(selectedGroup.entities, groupEntityService.netX));
        var maxY = groupEntityService.netY(_.max(selectedGroup.entities, groupEntityService.netY));
        var minX = groupEntityService.netX(_.min(selectedGroup.entities, groupEntityService.netX));
        var minY = groupEntityService.netY(_.min(selectedGroup.entities, groupEntityService.netY));
        return {
            key: selectedGroup.id,
            values: _.map(selectedGroup.entities, function (entity) {
                cmap.set(groupEntityService.subGroup(entity), groupEntityService.color(entity));
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
        // We need to compute the colorMap to tell sonic to use, to ensure that any difference in the order
        // in which entities are processed, by us or by sonic, doesn't change the color associated with an entity.
        var cmap = d3.map();
        var nodes = entityGraphBuilder.groupEntityToSonicData(scope.popupGroup, cmap);
        var links = entityGraphBuilder.groupLinksToSonicData(scope.popupGroup);
        var nodeColors = sonic.colors.colorMap(DF_GROUPS.entityColors, cmap);
        var sonicConf = _.merge(DF_GROUPS.sonicConf, {nodeStyle: {nodeColors: nodeColors}});
        var graphDivCheck = $interval(function () {
            var graphDivs = element.children('div.df-popup-graph');
            if (graphDivs.length) {
                $interval.cancel(graphDivCheck);
                scope.viz = sonic.viz(graphDivs[0], [
                    sonic.clone(nodes),
                    sonic.clone(links)
                ]).addNetwork(sonicConf);
            }
        }, 100, 100, false);
        element.on('$destroy', function () {
            $interval.cancel(graphDivCheck);
        });
    };
    return {
        restrict: 'E',
        replace: true,
        templateUrl: 'dragonfish/groups/groupPopup.tpl.html',
        link: link
    };
}])
;
