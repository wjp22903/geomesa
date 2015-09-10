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
    'stealth.dragonfish.similarity'
])

.constant('stealth.dragonfish.Constant', {
    icon: 'fa-puzzle-piece'
})

/**
 * The entities we'll show as a result of our first two analytics both have basically the same shape (for now, anyway),
 * which is captured by this class.
 *
 * Realistically, the results probably should come back as a SimpleFeatureCollection. We can refactor
 * ScoredEntity, here represented as a class, to almost more of a typeclass via a service:
 *    service('scoredEntity', [
 *    function () {
 *       this.id = function (result) { return result.get('id'); // when result is a ol3.Feature. for now, the service could just do result.id
 *       // similar accessor functions for the other fields of a Result, below
 *    }])
 * Switching to a 'typeclass' pattern like this would let us quickly change the return type, without changing
 * any 'client' code, as long as the clients do all accessing of result data through the typeclass.
 */
.factory('stealth.dragonfish.ScoredEntity', [
function () {
    return function (id, name, score, geom, time, thumbnail, description) {
        this.id = id;
        this.name = name;
        this.score = score;
        this.geom = geom;
        this.time = time;
        this.thumbnail = thumbnail;
        this.description = description;
    };
}])

/**
 * Responsible for creating new scopes to use in the sidebar, and correctly set properties associated with the scope
 * for use in templates and such.
 */
.service('stealth.dragonfish.sidebarService', [
'$rootScope',
'stealth.dragonfish.similarity.Constant',
'stealth.dragonfish.similarity.runner.QueryParamsService',
function ($rootScope, SimConstant, simQueryService) {
    // make sure to call scope.$destroy() when you're done with what we give you
    this.createScope = function (req, results) {
        var scope = $rootScope.$new();
        scope.request = req;
        scope.results = results;

        scope.searchSimilar = function (result) {
            $rootScope.$emit(SimConstant.applyEvent, simQueryService.runnerParams(result));
        };

        return scope;
    };
}])

/**
 * This service provides a 'display' method to show the results of applying a classifier or running a similarity search.
 * This method sets up a new category and populates the sidebar.
 */
.service('stealth.dragonfish.resultsService', [
'categoryManager',
'sidebarManager',
'stealth.core.geo.analysis.category.AnalysisCategory',
'stealth.core.utils.WidgetDef',
'stealth.dragonfish.Constant',
'stealth.dragonfish.sidebarService',
function (catMgr, sidebarManager, AnalysisCategory, WidgetDef, DF, sidebarService) {
    this.display = function (req, results) {
        var scope = sidebarService.createScope(req, results);

        var category = catMgr.addCategory(2, new AnalysisCategory(scope.request.name, DF.icon, function () {
            sidebarManager.removeButton(buttonId);
            scope.$destroy();
        }));

        var destroy = function () {
            catMgr.removeCategory(category.id);
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
