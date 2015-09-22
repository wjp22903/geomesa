/**
 * This module is designed to hold plugins associated with the dragonfish project, and thus exposes advanced
 * image processing capabilities as well as the embedding monster.
 *
 * Our initial target is 2 capabilities, which are fairly similar from the UI perspective:
 *   1) Apply a classifier from a bank of classifiers, to find entities (polygon/time pairs or image chips)
 *   2) Find similar entities to a given entity
 */
angular.module('stealth.dragonfish', [
    'stealth.dragonfish.classifier',
    'stealth.dragonfish.geo.ol3.layers',
    'stealth.dragonfish.similarity'
])

.constant('stealth.dragonfish.Constant', {
    icon: 'fa-puzzle-piece',
    space: {
        imagery: 'Imagery',
        fusion: 'Fusion'
    }
})

/**
 * The entities we'll show as a result of our first two analytics both have basically the same shape (for now, anyway),
 * which is captured by this class.
 */

.factory('stealth.dragonfish.scoredEntity', [
function () {
    return function (id, name, score, geom, time, thumbnail, description) {
        return new ol.Feature({
            id: id,
            name: name,
            score: score,
            geometry: geom || null, //can crash if given empty string
            time: time,
            thumbnail: thumbnail,
            description: description
        });
    };
}])

/**
 * Service for getting properties from ScoredEntities.
 * Expects ol.Feature objects
 */
.service('stealth.dragonfish.scoredEntityService', [
function () {
    this.id    = function (entity) { return entity.get('id'); };
    this.name  = function (entity) { return entity.get('name'); };
    this.score = function (entity) { return entity.get('score'); };
    this.geom  = function (entity) { return entity.getGeometry(); }; //ol.geom.getGeometry
    this.time  = function (entity) { return entity.get('time'); };
    this.thumbnail   = function (entity) { return entity.get('thumbnail'); };
    this.description = function (entity) { return entity.get('description'); };
}])

/**
 * Responsible for creating new scopes to use in the sidebar, and correctly set properties associated with the scope
 * for use in templates and such.
 */
.service('stealth.dragonfish.sidebarService', [
'$rootScope',
'stealth.dragonfish.scoredEntityService',
'stealth.dragonfish.similarity.Constant',
'stealth.dragonfish.similarity.runner.QueryParamsService',
function ($rootScope, scoredEntityService, SimConstant, simQueryService) {
    // make sure to call scope.$destroy() when you're done with what we give you
    this.createScope = function (req, results) {
        var scope = $rootScope.$new();
        scope.request = req;
        scope.results = results;
        scope.scoredEntityService = scoredEntityService;

        scope.searchSimilar = function (result) {
            $rootScope.$emit(SimConstant.applyEvent, simQueryService.runnerParams(result));
        };

        return scope;
    };
}])

/**
 * This service provides a 'display' method to show the results of applying a classifier or running a similarity search.
 * This method sets up a new category, adds the results to the map, and populates the sidebar.
 */
.service('stealth.dragonfish.resultsService', [
'$rootScope',
'categoryManager',
'sidebarManager',
'stealth.core.geo.analysis.category.AnalysisCategory',
'stealth.core.utils.WidgetDef',
'stealth.dragonfish.Constant',
'stealth.dragonfish.sidebarService',
'stealth.dragonfish.geo.ol3.layers.EntityLayer',
'stealth.dragonfish.geo.ol3.layers.EntityConstant',
function ($rootScope, catMgr, sidebarManager, AnalysisCategory, WidgetDef, DF, sidebarService, EntityLayer, EL) {
    this.display = function (req, results) {
        var scope = sidebarService.createScope(req, results);

        var category = catMgr.addCategory(2, new AnalysisCategory(scope.request.name, DF.icon, function () {
            sidebarManager.removeButton(buttonId);
            scope.$destroy();
        }));

        // populate the Map
        if (!_.isEmpty(scope.results)) {
            scope.entityLayer = new EntityLayer({name: scope.request.name, features: scope.results, categoryId: category.id});
            category.addLayer(scope.entityLayer);
        }

        var destroy = function () {
            if (scope.entityLayer) {
                $rootScope.$emit(EL.removeEvent, {layerId: scope.entityLayer.id, categoryId: category.id});
            }
            scope.$destroy();
        };

        var buttonId = sidebarManager.toggleButton(
            sidebarManager.addButton(scope.request.name, DF.icon, 500,
                new WidgetDef('st-df-sidebar', scope),
                new WidgetDef('st-pager', scope, "paging='paging' records='results'"),
            false, destroy),
        true);
    };
}])

/**
 * Simple template for the results sidebar
 */
.directive('stDfSidebar',
function () {
    return {
        restrict: 'E',
        templateUrl: 'dragonfish/sidebar.tpl.html'
    };
})
;
