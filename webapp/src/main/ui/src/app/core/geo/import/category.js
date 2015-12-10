angular.module('stealth.core.geo.import.category', [
    'stealth.core.geo.import.wizard',
    'stealth.core.wizard'
])

.run([
'$rootScope',
'ol3Map',
'categoryManager',
'stealth.core.geo.ol3.manager.Category',
'stealth.core.utils.WidgetDef',
'stealth.core.geo.import.wizard.WizFactory',
'wizardManager',
'ShapefileCache',
function ($rootScope, ol3Map, catMgr, Category, WidgetDef,
          wizardFactory, wizman, ShapefileCache) {
    var scope = $rootScope.$new();
    scope.layers = ShapefileCache.getLayers();

    scope.removeLayer = function (layer) {
        ol3Map.removeLayer(layer);
        ShapefileCache.removeLayer(layer);
    };

    scope.addLayer = function (layer) {
        ShapefileCache.addLayer(layer);
    };

    scope.launchShapefileWiz = function () {
        wizman.launchWizard(wizardFactory.createWizard());
    };

    var widgetDef = new WidgetDef('st-shp-category', scope);
    var category = new Category(2, 'Shapefile Features', 'fa-map-o', widgetDef, null, true);
    catMgr.addCategory(1, category);
}])

.service('ShapefileCache', [
function () {
    var layers = [];
    this.addLayer = function (layer) {
        layers.push(layer);
    };
    this.removeLayer = function (layer) {
        if (layers.indexOf(layer) !== -1) {
            layers.splice(layers.indexOf(layer), 1);
        }
    };
    this.getLayers = function () {
        return layers;
    };
}])

.directive('stShpCategory',
function () {
    return {
        templateUrl: 'core/geo/import/templates/shpcat.tpl.html'
    };
})
;

