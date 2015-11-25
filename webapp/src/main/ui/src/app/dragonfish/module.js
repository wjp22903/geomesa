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
    'stealth.dragonfish.similarity',
    'stealth.dragonfish.groups'
])

.constant('stealth.dragonfish.Constant', {
    icon: 'fa-puzzle-piece',
    space: {
        Imagery: {title: 'Imagery', icon: 'fa-file-image-o'},
        Fusion: {title: 'Fusion', icon: 'fa-sun-o'},
        Sigint: {title: 'Sigint', icon: 'fa-rss'}
    },
    highlightStyle: new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'red',
            width: 2
        }),
        text: new ol.style.Text({
            text: '\ue003', // map pin
            font: 'normal 26px CcriIcon',
            textBaseline: 'bottom',
            fill: new ol.style.Fill({
                color: 'yellow'
            }),
            stroke: new ol.style.Stroke({
                color: 'black',
                width: 2
            })
        }),
        image: new ol.style.Circle({
            radius: 5,
            fill: new ol.style.Fill({
                color: 'red'
            })
        })
    }),
    polyColor: '#FFFF99',
    pageResults: {pageSize: 10}
})

/**
 * The entities we'll show as a result of our first two analytics both have basically the same shape (for now, anyway),
 * which is captured by this class.
 */

.factory('stealth.dragonfish.scoredEntity', [
function () {
    return function (id, name, score, geom, time, thumbnailURL, description) {
        return new ol.Feature({
            id: id,
            name: name,
            score: score,
            geometry: geom || null, //can crash if given empty string
            time: time,
            thumbnailURL: thumbnailURL,
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
    this.id    = function (entity) { return entity.get('id') || entity.getId(); };
    this.name  = function (entity) { return entity.get('name'); };
    this.score = function (entity) { return entity.get('score'); };
    this.geom  = function (entity) { return entity.getGeometry(); }; //ol.geom.getGeometry
    this.time  = function (entity) { return entity.get('time'); };
    this.thumbnailURL = function (entity) { return entity.get('thumbnailURL'); };
    this.description  = function (entity) { return entity.get('description'); };
    this.hasThumbnail = function (entity) { return (this.thumbnailURL(entity)); };
}])

/**
 * Responsible for creating new scopes to use in the sidebar, and correctly set properties associated with the scope
 * for use in templates and such.
 */
.service('stealth.dragonfish.sidebarService', [
'$interpolate',
'$rootScope',
'CONFIG',
'ol3Map',
'stealth.core.geo.ol3.overlays.Vector',
'stealth.dragonfish.Constant',
'stealth.dragonfish.classifier.wizard.service',
'stealth.dragonfish.scoredEntityService',
'stealth.dragonfish.similarity.Constant',
'stealth.dragonfish.similarity.runner.QueryParamsService',
function ($interpolate, $rootScope, CONFIG, ol3Map, VectorOverlay, DF, classWizService, scoredEntityService, SimConstant, simQueryService) {
    // make sure to call scope.$destroy() when you're done with what we give you
    this.createScope = function (req) {
        var scope = $rootScope.$new();
        scope.request = req;
        scope.results = null;
        scope.scoredEntityService = scoredEntityService;
        scope.queryRunning = true;
        scope.entityLayer = null;
        scope.searchSimilar = function (result) {
            // in case mouseleave event doesn't happen
            scope.unhighlight(result);
            $rootScope.$emit(SimConstant.applyEvent, simQueryService.runnerParams(result));
        };
        scope.entityHighlighter = new VectorOverlay({
            styleBuilder: function () {
                return DF.highlightStyle;
            }
        });
        scope.entityHighlighter.addToMap();
        scope.$on('$destroy', function () {
            scope.entityHighlighter.removeFromMap();
        });
        scope.entitySort = function (result) {
            return scoredEntityService.score(result);
        };
        scope.highlight = function (result) {
            result.highlightFeature = result.clone();
            scope.entityHighlighter.addFeature(result.highlightFeature);
        };
        scope.unhighlight = function (result) {
            if (result.highlightFeature) {
                scope.entityHighlighter.removeFeature(result.highlightFeature);
                delete result.highlightFeature;
            }
        };
        scope.runAnotherQuery = function (request) {
            classWizService.launchWizard(request);
        };
        if (req) {
            var dtgFormat = 'YYYY-MM-DD HH:mm:ss [Z]'; // why isn't there a Stealth constant for displayDtgFormat?
            scope.lastSearch = {
                startDtg: (req.isGeomSource()) ? req.timeData.startDtg.format(dtgFormat) : undefined,
                endDtg: (req.isGeomSource()) ? req.timeData.endDtg.format(dtgFormat) : undefined,
                imageDtg: (req.isImageIdSource()) ? req.imageDtg.format(dtgFormat) : undefined,
                title: (req.isImageIdSource() && req.imageId) ? req.imageId : req.geom.name,
                titleIcon: (req.isImageIdSource()) ? 'fa fa-file-image-o' : 'ccri-icon ccri-icon-map-pin'
            };
        }
        scope.composeThumbnailUrl = function (result) {
            if (scoredEntityService.hasThumbnail(result)) {
                var template = _.get(CONFIG, 'dragonfish.thumbnailURL', '{{defaultUrl}}/dragonfish/thumbnail{{thumbnailName}}&h=128&w=128');
                return $interpolate(template)({
                    defaultUrl: _.get(CONFIG, 'geoserver.defaultUrl', ''),
                    thumbnailName: scoredEntityService.thumbnailURL(result)
                });
            } else {
                return 'assets/no_image_128x128.png';
            }
        };

        scope.floorFigure = function (figure, decimals) {
            if (!decimals) {
                decimals = 2;
            }
            var d = Math.pow(10, decimals);
            return (parseInt(figure*d, 10)/d).toFixed(decimals);
        };

        scope.paging = DF.pageResults;
        scope.dfIcon = DF.icon;

        scope.zoomTo = function (result) {
            ol3Map.fit(result.getGeometry());
        };

        return scope;
    };
}])

/**
 * This service provides a 'display' method to show the results of applying a classifier or running a similarity search.
 * This method sets up a new category, adds the results to the map, and populates the sidebar.
 */
.service('stealth.dragonfish.resultsService', [
'$log',
'$rootScope',
'categoryManager',
'ol3Map',
'sidebarManager',
'stealth.core.geo.analysis.category.AnalysisCategory',
'stealth.core.geo.ol3.format.GeoJson',
'stealth.core.utils.WidgetDef',
'stealth.dragonfish.Constant',
'stealth.dragonfish.sidebarService',
'stealth.dragonfish.scoredEntityService',
'stealth.dragonfish.geo.ol3.layers.styler',
'stealth.dragonfish.geo.ol3.layers.EntityLayer',
'stealth.dragonfish.geo.ol3.layers.EntityConstant',
function ($log, $rootScope, catMgr, ol3Map, sidebarManager, AnalysisCategory, GeoJson, WidgetDef, DF, sidebarService,
          scoredEntityService, entityStyler, EntityLayer, EL) {
    this.display = function (req, resultsPromise) {
        var scope = sidebarService.createScope(req);
        var category = catMgr.addCategory(2, new AnalysisCategory(scope.request.name, DF.icon, function () {
            sidebarManager.removeButton(buttonId);
            scope.$destroy();
        }));

        var destroy = function () {
            if (scope.entityLayer) {
                $rootScope.$emit(EL.removeEvent, {layerId: scope.entityLayer.id, categoryId: category.id});
            }
            catMgr.removeCategory(category.id);
            scope.$destroy();
        };

        var buttonId = sidebarManager.toggleButton(
            sidebarManager.addButton('Classifier Results: ' + scope.request.getTitle(), DF.icon, 500,
                new WidgetDef('st-df-sidebar', scope),
                new WidgetDef('st-pager', scope, "paging='paging' records='results'"),
                false,
                destroy
            ),
            true
        );
        scope.space = DF.space;
        scope.entityLayer = {viewState: {scoreCutoff: 0.0}}; // initialize for html
        var parser = new GeoJson(); // stealth GeoJson, extending OL3 for STEALTH-319
        resultsPromise
            .then(function (response) {
                scope.queryRunning = false;
                scope.results = _.sortBy(parser.readFeatures(response), function (scoredEntity) {
                    return -scoredEntityService.score(scoredEntity);
                });
                // populate the Map
                if (!_.isEmpty(scope.results)) {
                    scope.entityLayer = new EntityLayer({
                        queryable: true,
                        name: scope.request.name,
                        features: scope.results,
                        categoryId: category.id
                    });
                    scope.updateMap = function () {
                        scope.entityLayer.updateMap();
                    };
                    scope.getEntityColor = function (result) {
                        return entityStyler.getColorByScore(scope.scoredEntityService.score(result), scope.entityLayer.viewState.scoreCutoff);
                    };
                    category.addLayer(scope.entityLayer);
                    ol3Map.fit(scope.entityLayer.getExtent());
                }
            }, function (reason) {
                scope.queryRunning = false;
                scope.results = [];
                scope.getEntityColor = function () {
                    return '#000000';
                };
                $log.warn(reason);
            });
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

/**
 * A service to parse a flag out of CONFIG to determine whether we are using the 'Hardcoded' dragonfish-wps variants,
 * and if the "urn:" prefix should be stripped from classifier IDs (to account for an inconsistency in dragonfish?).
 */
.service('stealth.dragonfish.wps.prefixService', [
'CONFIG',
function (CONFIG) {
    /**
     * Set `dragonfish.wpsPrefix=Hardcoded` to use the Hardcoded dragonfish-wps variants
     */
    this.prefix = _.get(CONFIG, 'dragonfish.wpsPrefix', '');
}])

/**
 * A generically useful wps wrapper that takes CONFIG for the geoserver parameters.
 * This way, clients don't need to get CONFIG themselves, or remember quite so many parameters to pass to wps.
 */
.service('stealth.dragonfish.configWps', [
'wps',
'CONFIG',
function (wps, CONFIG) {
    this.submit = function (req) {
        return wps.submit(CONFIG.geoserver.defaultUrl, req, CONFIG.geoserver.omitProxy);
    };
}])
;
