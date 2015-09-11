angular.module('stealth.routeanalysis.wizard', [
    'stealth.core.geo.ol3.interaction',
    'stealth.core.geo.ol3.overlays',
    'stealth.core.geo.ol3.utils'
])

.service('routeAnalysisWizard', [
'$log',
'$rootScope',
'$interval',
'ol3Map',
'ol3Styles',
'wizardManager',
'colors',
'elementAppender',
'routeDrawHelper',
'stealth.core.geo.ol3.interaction.standard',
'stealth.core.geo.ol3.overlays.Vector',
'stealth.core.wizard.Step',
'stealth.core.wizard.Wizard',
'stealth.core.utils.WidgetDef',
function ($log, $rootScope, $interval,
          ol3Map, ol3Styles,
          wizardManager, colors,
          elementAppender, routeDrawHelper, ol3Interaction,
          VectorOverlay, Step, Wizard, WidgetDef) {
    var tag = 'stealth.routeanalysis.wizard.routeAnalysisWizard: ';
    $log.debug(tag + 'service started');

    var catScope;

    this.setCategoryScope = function (scope) { catScope = scope; };

    var createDrawWiz = function (wizardScope) {
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

        draw.on('drawend', function () {
            // disabling draw here prevents it from swallowing the double-click later
            // so I wait just a little bit
            // think anything that executes after this works
            $interval(function () {
                draw.setActive(false);
                modify.setActive(false);
                ol3Map.removeInteraction(modify);
            }, 1);
            return false;
        });

        var routeInfoPanel = null;
        wizardScope.featureOverlay = featureOverlay;
        return new Wizard(null, null, null, [
            new Step('Define route', new WidgetDef('st-ra-wiz-draw', wizardScope),
                new WidgetDef('st-ra-route-draw-tools', wizardScope, "feature-overlay='featureOverlay' geo-feature='geoFeature' route-info='routeInfo' source='source'"),
                false, function () {
                    if (wizardScope.geoFeature) {
                        routeDrawHelper.initFeature(wizardScope.geoFeature, wizardScope);
                    }
                    featureOverlay.addToMap();
                    ol3Map.addInteraction(modify);
                    ol3Map.addInteraction(draw);
                    elementAppender.append('.primaryDisplay',
                        'routeanalysis/wizard/templates/routePoints.tpl.html', wizardScope,
                        function (val) { routeInfoPanel = val; }
                    );
                }, function () {
                    if (routeInfoPanel) {
                        routeInfoPanel.remove();
                    }
                    ol3Map.removeInteraction(draw);
                    featureOverlay.removeFromMap();
                    if (wizardScope.geoFeature) {
                        routeDrawHelper.detachFeature(wizardScope.geoFeature);
                    }
                })
        ]);
    };
    var createEndWiz = function (wizardScope) {
        return new Wizard(null, null, 'fa-check text-success', [
            new Step('Set options', new WidgetDef('st-ra-route-options-wiz', wizardScope), null, true, null, function (success) {
                if (success) {
                    wizardScope.query.derivedLayer.title = wizardScope.name;
                    wizardScope.query.derivedLayer.params.arrowColor = wizardScope.query.params.fillColor;
                    wizardScope.query.derivedLayer.params.fillColor = wizardScope.query.params.fillColor;
                    wizardScope.query.derivedLayer.gsLayer = wizardScope.query.foundLayer;

                    $rootScope.$emit('routeanalysis:request:route',
                        //TODO - package these settings into an obj within wizardScope
                        {
                            name: wizardScope.name,
                            routeFeature: wizardScope.geoFeature,
                            dataSource: wizardScope.datasource,
                            resolution: wizardScope.resolution
                        },
                        catScope,
                        wizardScope.query.derivedLayer
                    );
                    catScope.toggleLayer(wizardScope.query.derivedLayer, wizardScope.geoFeature);
                    catScope.setYAxisLabel(wizardScope.query.derivedLayer, wizardScope.yAxis);
                }
            })
        ]);
    };

    this.launch = function (gsLayer) {
        var wizardScope = $rootScope.$new();
        var nextColor = colors.getColor();
        angular.extend(wizardScope, {
            name: gsLayer.Title,
            type: 'route',
            source: 'drawing',
            datasource: gsLayer,
            fillColor: nextColor,
            style: {
                'background-color': nextColor
            },
            resolution: 0.001,
            yAxis: "Intensity level"
        });

        wizardManager.launchWizard(
            new Wizard('Route Analysis', 'fa-crosshairs', 'fa-ellipsis-h', [
                new Step('Select route source', new WidgetDef('st-ra-wiz-source', wizardScope), null, true,
                    function (stepNum) {
                        this.setEndIconClass('fa-ellipsis-h');
                        this.truncateSteps(stepNum);
                    },
                    function (success) {
                        if (success) {
                            var derivedLayer = {
                                title: "Route Analysis on " + wizardScope.name,
                                name: wizardScope.name,
                                viewState: {
                                    isOnMap: false,
                                    toggledOn: false,
                                    isLoading: false,
                                    isRemovable: true
                                },
                                params: {
                                    arrowColor: wizardScope.fillColor
                                }
                            };

                            if (!_.isUndefined(catScope)) {
                                _.each(catScope.workspaces, function (ws) {
                                    var foundLayer = _.find(ws, function (lyr) {
                                        return lyr.Name === wizardScope.datasource.Name;
                                    });
                                    if (!_.isUndefined(foundLayer)) {
                                        foundLayer.derivedLayers.push(derivedLayer);
                                        wizardScope.query = {
                                            foundLayer: foundLayer,
                                            derivedLayer: derivedLayer,
                                            params: {
                                                fillColor: wizardScope.fillColor
                                            }
                                        };
                                    }
                                });
                            }

                            switch (wizardScope.source) {
                                case 'server':
                                    //TODO
                                    break;
                                case 'file':
                                case 'drawing':
                                    this.appendWizard(createDrawWiz(wizardScope));
                                    break;
                            }
                            this.appendWizard(createEndWiz(wizardScope));
                        }
                    }
                )
            ])
        );
    };
}])

.directive('stRaWizSource', [
function () {
    return {
        restrict: 'E',
        replace: true,
        templateUrl: 'routeanalysis/wizard/templates/source.tpl.html'
    };
}])

.directive('stRaWizDraw', [
function () {
    return {
        restrict: 'E',
        replace: true,
        templateUrl: 'routeanalysis/wizard/templates/draw.tpl.html'
    };
}])

.directive('stRaRouteOptionsWiz',
function () {
    return {
        restrict: 'E',
        templateUrl: 'routeanalysis/wizard/templates/routeOptions.tpl.html'
    };
})

.directive('stRaRouteDrawTools', [
'$timeout',
'ol3Map',
'csvFormat',
'routeDrawHelper',
'stealth.core.geo.ol3.format.GeoJson',
function ($timeout, ol3Map, csvFormat, routeDrawHelper, GeoJson) {
    return {
        restrict: 'E',
        scope: {
            featureOverlay: '=',
            geoFeature: '=',
            routeInfo: '=',
            source: '='
        },
        templateUrl: 'routeanalysis/wizard/templates/drawTools.tpl.html',
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
