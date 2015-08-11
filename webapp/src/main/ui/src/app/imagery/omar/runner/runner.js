angular.module('stealth.imagery.omar.runner', [
    'stealth.core.geo.ol3.map',
    'stealth.core.geo.ol3.overlays',
    'stealth.core.geo.ol3.utils',
    'stealth.core.sidebar',
    'stealth.core.utils',
    'stealth.imagery.omar.results.category',
    'stealth.imagery.omar.results.selection',
    'stealth.imagery.omar.wizard'
])

.run([
'$rootScope',
'stealth.imagery.omar.runner.SearchRunner',
function ($rootScope, imagerySearchRunner) {
    $rootScope.$on('imagery:search', function (evt, req) {
        // we expect req to be an imagery.Query
        imagerySearchRunner.run(req);
    });
}])

.service('stealth.imagery.omar.runner.SearchRunner', [
'$rootScope',
'toastr',
'categoryManager',
'ol3Map',
'sidebarManager',
'stealth.core.geo.ol3.format.GeoJson',
'stealth.core.geo.ol3.layers.MapLayer',
'stealth.core.geo.ol3.overlays.Vector',
'stealth.core.geo.ol3.utils.geomHelper',
'stealth.core.utils.WidgetDef',
'stealth.imagery.omar.results.category.Category',
'stealth.imagery.omar.results.selection.ImagerySelection',
'stealth.imagery.omar.wizard',
function ($rootScope, toastr, catMgr, ol3Map, sidebarManager, GeoJson, MapLayer, VectorOverlay, geomHelper, WidgetDef, Category, ImagerySelection, omarWizard) {
    var geoJsonFormat = new GeoJson(); // stealth GeoJson, extending OL3 for STEALTH-319
    this.run = function (query) {
        var category = catMgr.addCategory(2, new Category(query.params.storeName, function () {
            sidebarManager.removeButton(buttonId);
            scope.$destroy();
        }));

        var scope = $rootScope.$new();
        scope.query = query;
        scope.query.category = category;

        var destroy = function () {
            catMgr.removeCategory(category.id);
            scope.$destroy();
        };
        var restart = function () {
            destroy();
            omarWizard.launchWizard();
        };
        scope.select = new ImagerySelection(scope.query, restart);
        scope.paging = { pageSize: 10 };

        scope.progressText = "Searching...";

        var updateProgress = function (nextText) {
            // unfortunately, all the updateProgress calls in the handler below don't affect anything
            // the template isn't re-rendered until after the function call
            // not sure how to fix that
            scope.progressText = nextText;
        };

        var overlayStyle = function (fillColor, strokeColor) {
            return new ol.style.Style({
                fill: new ol.style.Fill({ color: fillColor }),
                stroke: new ol.style.Stroke({ color: strokeColor, width: 1.5 })
            });
        };

        query.findImagery()
            .then(function (response) {
                var parser = ((query.params.server.parser == 'GML') ? new ol.format.GML2() : new GeoJson()); // stealth GeoJson, extending OL3 for STEALTH-319
                updateProgress("Parsing results...");
                var results = parser.readFeatures(response.data);
                if (query.params.server.requiresFlip) {
                    _.each(results, function (f) {
                        geomHelper.flipXY(f.getGeometry());
                    });
                }
                if (_.isEmpty(query.params.sortField.trim())) {
                    query.results = results;
                } else {
                    updateProgress("Sorting...");
                    if (query.params.sortOrder === 'A') {
                        query.results = _.sortBy(results, function (image) {
                            return image.attributes[query.params.sortField];
                        });
                    } else {
                        query.results = _.sortBy(results, function (image) {
                            return image.attributes[query.params.sortField];
                        }).reverse();
                    }
                }

                var normalStyle = overlayStyle('rgba(255,255,255,0.1)', '#3399CC');
                var layer = new ol.layer.Vector({
                    source: new ol.source.Vector({ features: results }),
                    style: normalStyle
                });
                updateProgress("Adding Layer...");
                var mapLayer = category.addLayer(new MapLayer('Locations', layer, false, 10));
                scope.select.coverageLayer = mapLayer;
                var featureOverlay = new VectorOverlay({
                    colors: ['#CC0033'],
                    styleBuilder: _.curry(overlayStyle)('rgba(255,30,30,0.1)')
                });
                featureOverlay.addToMap();
                scope.select.featureOverlay = featureOverlay;
                updateProgress("Ready!");
            }, function () {
                toastr.error('Error: image search failed');
            });

        var buttonId = sidebarManager.toggleButton(
            sidebarManager.addButton(query.params.storeName, 'fa-image', 500,
                new WidgetDef('st-im-omar-wiz-select', scope),
                new WidgetDef('st-pager', scope, "paging='paging' records='query.results'"), false, destroy),
            true);
    };
}])

.directive('stImOmarWizSelect',
function () {
    return {
        restrict: 'E',
        templateUrl: 'imagery/omar/results/select.tpl.html'
    };
})
;
