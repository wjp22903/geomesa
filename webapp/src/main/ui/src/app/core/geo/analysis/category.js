angular.module('stealth.core.geo.analysis.category', [
    'stealth.core.geo.ol3.manager',
    'stealth.core.geo.ol3.map',
    'stealth.core.utils'
])

.factory('stealth.core.geo.analysis.category.AnalysisCategory', [
'$rootScope',
'$timeout',
'categoryManager',
'ol3Map',
'stealth.core.geo.ol3.manager.Category',
'stealth.core.utils.WidgetDef',
function ($rootScope, $timeout, categoryManager, ol3Map, Base, WidgetDef) {
    var AnalysisCategory = function (title, iconClass, onClose) {
        var scope = $rootScope.$new();
        scope.layers = [];

        this.toggleVisibility = function (layer) {
            var ol3Layer = layer.getOl3Layer();
            ol3Layer.setVisible(!ol3Layer.getVisible());
        };
        this.addLayer = function (layer) {
            _.merge(layer.viewState, {toggledOn: true});
            scope.layers.push(layer);
            ol3Map.addLayer(layer);

            var ol3Layer = layer.getOl3Layer();
            // Update viewState on layer visibility change.
            ol3Layer.on('change:visible', function () {
                $timeout(function () {
                    layer.viewState.toggledOn = ol3Layer.getVisible();
                });
            });

            return layer;
        };
        this.removeLayer = function (layer) {
            scope.layers = _.without(scope.layers, layer);
            ol3Map.removeLayer(layer);
            if (_.isEmpty(scope.layers)) {
                categoryManager.removeCategory(this.id);
            }
        };
        this.getLayers = function () {
            return scope.layers;
        };
        var wrappedOnClose = function () {
            _.each(scope.layers, function (layer) {
                ol3Map.removeLayer(layer);
            });
            scope.$destroy();
            if (_.isFunction(onClose)) {
                onClose();
            }
        };

        scope.toggleVisibility = this.toggleVisibility;
        scope.removeLayer = this.removeLayer;

        Base.apply(this, [0, title, iconClass,
                          new WidgetDef('st-analysis-category', scope,
                                        "layers='layers' toggle-visibility='toggleVisibility(layer)' remove-layer='removeLayer(layer)'"),
                          null, true, true, wrappedOnClose]);
    };
    AnalysisCategory.prototype = Object.create(Base.prototype);
    return AnalysisCategory;
}])

.directive('stAnalysisCategory', [
function () {
    return {
        restrict: 'E',
        scope: {
            layers: '=',
            toggleVisibility: '&',
            removeLayer: '&'
        },
        templateUrl: 'core/geo/analysis/analysisCategory.tpl.html'
    };
}])
;
