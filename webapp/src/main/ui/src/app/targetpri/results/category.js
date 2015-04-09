angular.module('stealth.targetpri.results')

.factory('stealth.targetpri.results.Category', [
'$rootScope',
'$timeout',
'ol3Map',
'stealth.core.geo.ol3.manager.Category',
'stealth.core.utils.WidgetDef',
function ($rootScope, $timeout, ol3Map, Base, WidgetDef) {
    var Category = function (title, onClose) {
        var scope = $rootScope.$new();
        scope.layers = [];
        scope.toggleVisibility = function (layer) {
            var ol3Layer = layer.getOl3Layer();
            ol3Layer.setVisible(!ol3Layer.getVisible());
        };

        this.addLayer = function (layer, registerSearchable) {
            layer.viewState = {
                toggledOn: true
            };
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
        Base.apply(this, [0, title, 'fa-crosshairs',
                          new WidgetDef('st-target-pri-category', scope,
                                        "layers='layers' toggle-visibility='toggleVisibility(layer)'"),
                          null, true, true, function () {
            _.each(scope.layers, function (layer) {
                ol3Map.removeLayer(layer);
            });
            scope.$destroy();
            if (_.isFunction(onClose)) {
                onClose();
            }
        }]);
    };
    Category.prototype = Object.create(Base.prototype);
    return Category;
}])

.directive('stTargetPriCategory', [
function () {
    return {
        restrict: 'E',
        scope: {
            layers: '=',
            toggleVisibility: '&'
        },
        templateUrl: 'targetpri/results/category.tpl.html'
    };
}])
;
