/*
 * Module for a wizard to import a shapefile
 */

angular.module('stealth.core.geo.import.shapefile', [
    'stealth.core.utils',
    'stealth.core.wizard',
    'stealth.core.geo.import.category'
])

/**
 * Create a Step to be used in Wizard creation, to support file upload.
 */
.factory('shapefile.StepFactory', [
'stealth.core.utils.WidgetDef',
'stealth.core.wizard.Step',
function (WidgetDef, Step) {
    var self = {
        createStep: function (wizardScope, setup, teardown) {
            var widget = new WidgetDef('st-up-wiz-shpfile', wizardScope);
            return new Step('Select Shapefile', widget, null, true, setup, teardown);
        }
    };
    return self;
}])

.controller('shapefile.Controller', [
'$scope',
'ol3Map',
'stealth.core.geo.ol3.layers.GeoJsonVectorLayer',
'ShapefileCache',
function ($scope, ol3Map, GeoJsonVectorLayer, ShapefileCache) {
    $scope.loadError = null;
    $scope.progress = ' ';
    $scope.validFile = false;
    $scope.geoJson = null;

    $scope.$watch('geoJson', function (geojson) {
        var processFeatures = function (features, name) {
                var olFeatures = [],
                    geodude;
                _.each(features, function (feature) {
                    olFeatures.push(new ol.format.GeoJSON().readFeature(feature));
                });
                geodude = new GeoJsonVectorLayer({
                    name: name,
                    queryable: true,
                    queryFn: function () {
                        this.loadStart();
                        this.loadFeatures(olFeatures);
                        this.loadEnd();
                    },
                    layerThisBelongsTo: {Name: 'layerName', KeywordConfig: {}}
                });
                geodude.styleDirectiveScope.removeLayer = function () {
                    ol3Map.removeLayer(geodude);
                    ShapefileCache.removeLayer(geodude);
                };
                ol3Map.addLayer(geodude);
                ShapefileCache.addLayer(geodude);
            };
        if (geojson) {
            if (angular.isArray(geojson)) {
                _.each(geojson, function (g) {
                    processFeatures(g.features, g.fileName);
                });
            } else {
                processFeatures(geojson.features, geojson.fileName);
            }
            $scope.thinking = false;
            $scope.progress = "Features have been added to the map.";
        }
    });
}])

.directive('stUpWizShpfile',
function () {
    return {
        restrict: 'E',
        templateUrl: 'core/geo/import/templates/wiz.tpl.html',
        controller: 'shapefile.Controller',
        link: function (scope, element) {
            element.bind("change", function (changeEvent) {
                var reader = new FileReader();
                scope.validFile = changeEvent.target.value.indexOf(".zip") > -1;
                reader.onload = function (loadEvent) {
                    scope.$apply(function () {
                        scope.thinking = true;
                        scope.progress = "Processing Shapefile Features...";
                    });
                    setTimeout(function () {
                        scope.$apply(function () {
                            shp(loadEvent.target.result).then(function (geojson) {
                                scope.geoJson = geojson;
                            }, function () {
                                scope.thinking = false;
                                scope.progress = "Error. There is something wrong with your file.";
                            });
                        });
                    }, 1000);
                };
                reader.readAsArrayBuffer(changeEvent.target.files[0]);
            });
        }
    };
})

.directive('filecheck', function () {
    return {
        require: 'ngModel',
        link: function (scope, elm, attrs, ctrl) { // eslint-disable-line no-unused-vars
            ctrl.$validators.asyncupload = function () {
                return scope.validFile;
            };
        }
    };
})
;
