angular.module('stealth.core.geo.analysis.category', [
    'stealth.core.geo.ol3.manager',
    'stealth.core.geo.ol3.map',
    'stealth.core.utils'
])

.factory('stealth.core.geo.analysis.category.AnalysisCategory', [
'$rootScope',
'$timeout',
'ol3Map',
'stealth.core.geo.ol3.manager.Category',
'stealth.core.utils.WidgetDef',
function ($rootScope, $timeout, ol3Map, Base, WidgetDef) {
    var AnalysisCategory = function (title, iconClass, onClose) {
        var scope = $rootScope.$new();
        scope.layers = [];
        scope.toggleVisibility = function (layer) {
            var ol3Layer = layer.getOl3Layer();
            ol3Layer.setVisible(!ol3Layer.getVisible());
        };

        this.toggleVisibility = function (layer) {
            scope.toggleVisibility(layer);
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
        var wrappedOnClose = function () {
            _.each(scope.layers, function (layer) {
                ol3Map.removeLayer(layer);
            });
            scope.$destroy();
            if (_.isFunction(onClose)) {
                onClose();
            }
        };
        Base.apply(this, [0, title, iconClass,
                          new WidgetDef('st-analysis-category', scope,
                                        "layers='layers' toggle-visibility='toggleVisibility(layer)'"),
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
            toggleVisibility: '&'
        },
        templateUrl: 'core/geo/analysis/analysisCategory.tpl.html'
    };
}])
;
