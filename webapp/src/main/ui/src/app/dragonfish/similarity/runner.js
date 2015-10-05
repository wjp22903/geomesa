/**
 * How to run a similarity search. This module is quite similar to the classifier runner.
 */
angular.module('stealth.dragonfish.similarity.runner', [
    'stealth.dragonfish'
])

/**
 * For now, we pretend it is enough to provide the source entityId as the similarity search parameter.
 * Later we might provide things like: additional filtering (only return entities of type X), number of results, etc.
 *
 * We also require a 'name' for the query, for convenience at the moment. This is not supposed to be the 'name' of
 * the entity referred to by the entityId, just the name for the query (to display as the title of the results).
 */
.factory('stealth.dragonfish.similarity.runner.QueryParams', [
function () {
    return function (name, entityId) {
        this.name = name;
        this.entityId = entityId;
    };
}])

.service('stealth.dragonfish.similarity.runner.QueryParamsService', [
'stealth.dragonfish.scoredEntityService',
'stealth.dragonfish.similarity.runner.QueryParams',
function (scoredEntityService, QueryParams) {
    this.runnerParams = function (scoredEntity) {
        return new QueryParams("Entities similar to " + scoredEntityService.name(scoredEntity), scoredEntityService.id(scoredEntity));
    };
}])

/**
 * A service to actually run similarity search.
 * Like classification.runner, this is a placeholder for calling WPS processes and such
 */
.service('stealth.dragonfish.similarity.runner.service', [
'$log',
'$q',
'stealth.dragonfish.scoredEntity',
function ($log, $q, scoredEntity) {
    this.run = function (queryParams) {
        $log.debug(queryParams); // no eslint error. we'll certainly use queryParams when we make the wps
        return $q(function (resolve) {
            setTimeout(function () {
                var parser = new ol.format.GeoJSON();
                resolve(parser.writeFeatures([
                    scoredEntity('abcd', 'Entity X', 0.97, new ol.geom.Point([3, 40]), '', '', ''),
                    scoredEntity('efgh', 'Entity Y', 0.91, new ol.geom.Point([14.5, 37]), '', '', '')
                ]));
            }, 100); // simulate a delay
        });
    };
}])

/**
 * Set up event listener. The 'more Like This' button is the only producer of this event for now.
 */
.run([
'$rootScope',
'stealth.dragonfish.resultsService',
'stealth.dragonfish.similarity.Constant',
'stealth.dragonfish.similarity.runner.service',
function ($rootScope, resultsService, SimConstant, runnerService) {
    $rootScope.$on(SimConstant.applyEvent, function (evt, req) { // eslint-disable-line no-unused-vars
        resultsService.display(req, runnerService.run(req));
    });
}])
;
