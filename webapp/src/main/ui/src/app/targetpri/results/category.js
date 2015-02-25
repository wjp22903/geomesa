angular.module('stealth.targetpri.results')

.factory('stealth.targetpri.results.Category', [
'$rootScope',
'$timeout',
'$q',
'$http',
'$filter',
'ol3Map',
'stealth.core.geo.ol3.manager.Category',
'stealth.core.utils.WidgetDef',
'mapClickSearchService',
'CONFIG',
function ($rootScope, $timeout, $q, $http, $filter, ol3Map, Base, WidgetDef, mapClickSearchService, CONFIG) {
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

            if (registerSearchable) {
                layer.searchId = mapClickSearchService.registerSearchable(function (coord, res) {
                    if (layer.getOl3Layer().getVisible()) {
                        var url = layer.getOl3Layer().getSource().getGetFeatureInfoUrl(
                            coord, res, CONFIG.map.projection, {
                                INFO_FORMAT: 'application/json',
                                FEATURE_COUNT: 999999,
                                SLD_BODY: null,
                                STYLES: 'stealth_dataPoints'
                            }
                        );
                        return $http.get($filter('cors')(url, null, CONFIG.geoserver.omitProxy))
                            .then(function (response) {
                                return {
                                    name: layer.name,
                                    records: _.pluck(response.data.features, 'properties'),
                                    layerFill: {
                                        display: 'none'
                                    }
                                };
                            }, function (response) {
                                return {
                                    name: layer.Title,
                                    records: [],
                                    isError: true,
                                    reason: 'Server error'
                                };
                            });
                    } else {
                        return $q.when({name: layer.Title, records:[]}); //empty results
                    }
                });
            }

            return layer;
        };
        Base.apply(this, [0, title, 'fa-crosshairs',
                          new WidgetDef('st-target-pri-category', scope,
                                        "layers='layers' toggle-visibility='toggleVisibility(layer)'"),
                          null, true, true, function () {
            _.each(scope.layers, function (layer) {
                ol3Map.removeLayer(layer);
                if (_.isNumber(layer.searchId)) {
                    mapClickSearchService.unregisterSearchableById(layer.searchId);
                    delete layer.searchId;
                }
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
