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
    return function (title, entityId) {
        this.title = title;
        this.entityId = entityId;
        this.getTitle = function () {
            return title;
        };
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
'$interpolate',
'$http',
'CONFIG',
'stealth.dragonfish.scoredEntity',
function ($interpolate, $http, CONFIG, scoredEntity) {
    var _self = this;
    this.knn = _.get(CONFIG, 'knn', {url: "cors/{{defaultUrl}}/../knn-endpoint/knn/{{entityId}}%3Fk%3D{{k}}", k: 30});
    this.run = function (queryParams) {
        var encodedUrl = $interpolate(_self.knn.url)({
            defaultUrl: CONFIG.geoserver.defaultUrl,
            entityId: encodeURIComponent(queryParams.entityId),
            k: _self.knn.k
        });
        return $http.get(encodedUrl).then(function (response) {
            return _.map(response.data, function (idScore) {
                return scoredEntity(idScore.id, idScore.id, idScore.score);
            });
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
