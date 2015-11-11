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
    panelWidth: 400
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
;
