angular.module('stealth.targetpri.wizard.route', [
    'stealth.core.geo.ol3.format',
    'stealth.core.geo.ol3.interaction',
    'stealth.core.geo.ol3.overlays',
    'stealth.core.geo.ol3.utils'
])

.factory('routeTpWizFactory', [
'$rootScope',
'stealth.core.geo.ol3.interaction.standard',
'stealth.core.geo.ol3.overlays.Vector',
'stealth.core.wizard.Wizard',
'stealth.core.wizard.Step',
'stealth.core.utils.WidgetDef',
'ol3Map',
'ol3Styles',
'elementAppender',
'routeDrawHelper',
function ($rootScope, ol3Interaction, VectorOverlay, Wizard, Step, WidgetDef, ol3Map, ol3Styles, elementAppender, routeDrawHelper) {
    var self = {
        createSourceWiz: function (wizardScope) {
            return new Wizard(null, null, 'fa-ellipsis-h', [
                new Step('Select route source', new WidgetDef('st-tp-wiz-source', wizardScope), null, true,
                    function (stepNum) {
                        this.setEndIconClass('fa-ellipsis-h');
                        this.truncateSteps(stepNum);
                    },
                    function (success) {
                        if (success) {
                            switch (wizardScope.source) {
                                case 'server':
                                    //TODO
                                    break;
                                case 'file':
                                case 'drawing':
                                    this.appendWizard(self.createDrawWiz(wizardScope));
                                    break;
                            }
                            this.appendWizard(self.createEndWiz(wizardScope));
                        }
                    },
                    true
                )
            ]);
        },
        createDrawWiz: function (wizardScope) {
            var featureOverlay = new VectorOverlay({
                colors: ['#CC0099'],
                styleBuilder: _.curry(ol3Styles.getLineStyle)(3)
            });
            if (wizardScope.geoFeature) {
                featureOverlay.addFeature(wizardScope.geoFeature);
            }
            var modify = ol3Interaction.getModify(featureOverlay.getFeatures());
            var draw = new ol.interaction.Draw({
                features: featureOverlay.getFeatures(),
                type: 'LineString'
            });
            draw.on('drawstart', function (evt) {
                wizardScope.$apply(function () {
                    if (wizardScope.geoFeature) {
                        draw.finishDrawing();
                    } else {
                        routeDrawHelper.initFeature(evt.feature, wizardScope);
                    }
                });
            });

            var routeInfoPanel = null;
            wizardScope.featureOverlay = featureOverlay;
            return new Wizard(null, null, null, [
                new Step('Define route', new WidgetDef('st-tp-wiz-draw', wizardScope),
                    new WidgetDef('st-tp-route-draw-tools', wizardScope, "feature-overlay='featureOverlay' geo-feature='geoFeature' route-info='routeInfo' source='source'"),
                    false, function () {
                        if (wizardScope.geoFeature) {
                            routeDrawHelper.initFeature(wizardScope.geoFeature, wizardScope);
                        }
                        featureOverlay.addToMap();
                        ol3Map.addInteraction(modify);
                        ol3Map.addInteraction(draw);
                        elementAppender.append('.primaryDisplay',
                            'targetpri/wizard/templates/routePoints.tpl.html', wizardScope,
                            function (val) { routeInfoPanel = val; }
                        );
                    }, function () {
                        if (routeInfoPanel) {
                            routeInfoPanel.remove();
                        }
                        ol3Map.removeInteraction(draw);
                        ol3Map.removeInteraction(modify);
                        featureOverlay.removeFromMap();
                        if (wizardScope.geoFeature) {
                            routeDrawHelper.detachFeature(wizardScope.geoFeature);
                        }
                    }
                )
            ]);
        },
        createEndWiz: function (wizardScope) {
            var now = moment.utc();
            wizardScope.proximityMeters = 2000;
            wizardScope.startDtg = now.clone().subtract(7, 'days');
            wizardScope.endDtg = now;
            return new Wizard(
                null,
                null,
                'fa-check text-success',
                [
                    new Step('Select data', new WidgetDef('st-tp-wiz-data', wizardScope), null, true),
                    new Step(
                        'Set options',
                        new WidgetDef('st-tp-route-options-wiz', wizardScope),
                        null,
                        true,
                        null,
                        function (success) {
                            if (success) {
                                $rootScope.$emit('targetpri:request:route',
                                    //TODO - package these settings into an obj within wizardScope
                                    {
                                        name: wizardScope.name,
                                        startDtg: wizardScope.startDtg,
                                        endDtg: wizardScope.endDtg,
                                        proximityMeters: wizardScope.proximityMeters,
                                        routeFeature: wizardScope.geoFeature,
                                        dataSources: wizardScope.datasources
                                    }
                                );
                            }
                        },
                        false
                    )
                ]
            );
        }
    };
    return self;
}])

.directive('stTpRouteOptionsWiz', [
function () {
    return {
        restrict: 'E',
        replace: true,
        templateUrl: 'targetpri/wizard/templates/routeOptions.tpl.html'
    };
}])

.directive('stTpRouteDrawTools', [
'$timeout',
'ol3Map',
'stealth.core.geo.ol3.format.GeoJson',
'csvFormat',
'routeDrawHelper',
function ($timeout, ol3Map, GeoJson, csvFormat, routeDrawHelper) {
    return {
        restrict: 'E',
        scope: {
            featureOverlay: '=',
            geoFeature: '=',
            routeInfo: '=',
            source: '='
        },
        templateUrl: 'targetpri/wizard/templates/drawTools.tpl.html',
        link: function (scope, element) {
            var geoJsonFormat = new GeoJson(); // stealth GeoJson, extending OL3 for STEALTH-319
            var fileInput = element.append('<input type="file" class="hidden">')[0].lastChild;

            //Couple FileReader to the hidden file input created above.
            FileReaderJS.setupInput(fileInput, {
                readAsDefault: 'Text',
                on: {
                    load: function (e, file) {
                        fileInput.value = null;
                        var feature = null;
                        switch (file.extra.extension.toLowerCase()) {
                            case 'json':
                                feature = geoJsonFormat.readFeature(e.target.result);
                                break;
                            case 'csv':
                                feature = csvFormat.csvToFeatures(e.target.result, 'LineString', csvFormat.coordFormat.dmshCombined, ['DMS'])[0];
                                break;
                            default:
                                return;
                        }
                        if (feature && feature.getGeometry().getType() === 'LineString') {
                            routeDrawHelper.initFeature(feature, scope, function () {
                                scope.featureOverlay.getFeatures().clear();
                                scope.featureOverlay.addFeature(feature);
                                ol3Map.fit(feature.getGeometry());
                            });
                        }
                    }
                }
            });

            scope.erase = function () {
                $timeout(function () {
                    scope.geoFeature = null;
                    scope.routeInfo = null;
                    scope.featureOverlay.getFeatures().clear();
                });
            };

            scope.upload = function () {
                $timeout(function () {
                    fileInput.click();
                });
            };
            scope.save = function (format) {
                if (scope.geoFeature && scope.geoFeature.getGeometry().getType() === 'LineString') {
                    var output = null,
                        type = 'text/plain';
                    switch (format) {
                        case 'json':
                            output = geoJsonFormat.writeFeature(scope.geoFeature);
                            type = 'application/json';
                            break;
                        case 'csv':
                            output = csvFormat.geoJsonToCsv(geoJsonFormat.writeFeatureObject(scope.geoFeature),
                                csvFormat.coordFormat.dmshCombined, ['DMS']);
                            type = 'text/csv';
                            break;
                    }
                    var blob = new Blob([output], {type: type});
                    saveAs(blob, 'route.' + format);
                }
            };

            if (scope.source === 'file') {
                scope.upload();
            }
        }
    };
}])
;
