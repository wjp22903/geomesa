angular.module('stealth.targetpri.wizard.route', [
    'stealth.core.geo.ol3.format',
    'stealth.core.geo.ol3.interaction',
    'stealth.core.geo.ol3.overlays',
    'stealth.core.geo.ol3.utils'
])

.factory('stealth.targetpri.wizard.route.routeTpWizFactory', [
'$rootScope',
'cookies',
'stealth.core.geo.ol3.interaction.standard',
'stealth.core.geo.ol3.overlays.Vector',
'stealth.core.wizard.Wizard',
'stealth.core.wizard.Step',
'stealth.core.utils.WidgetDef',
'ol3Map',
'ol3Styles',
'elementAppender',
'stealth.core.geo.ol3.utils.routeDrawHelper',
'stealth.targetpri.runner.TargetType',
'stealth.targetpri.wizard.TargetpriCookies',
function ($rootScope, cookies, ol3Interaction, VectorOverlay, Wizard, Step, WidgetDef, ol3Map, ol3Styles,
        elementAppender, routeDrawHelper, TT, COOKIES) {
    var self = {
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
                    false,
                    // setup function:
                    function () {
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
                    },
                    // teardown function:
                    function () {
                        if (routeInfoPanel) {
                            routeInfoPanel.remove();
                        }
                        ol3Map.removeInteraction(draw);
                        ol3Map.removeInteraction(modify);
                        featureOverlay.removeFromMap();
                        if (wizardScope.geoFeature) {
                            routeDrawHelper.detachFeature(wizardScope.geoFeature);
                        }
                    })
            ]);
        },
        createEndWiz: function (wizardScope) {
            var now = moment.utc();
            wizardScope.proximityMeters = 2000;
            wizardScope.startDtg = now.clone().subtract(7, 'days');
            wizardScope.endDtg = now;
            _.merge(wizardScope,
                _.mapValues(cookies.get(COOKIES.time, 0), function (time) {
                    return time ? moment.utc(time) : null;
                }),
                cookies.get(COOKIES.proximityMeters, 0)
            );
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
                                //Save search properties in a cookie - expires in a year
                                var time = {
                                    startDtg: wizardScope.startDtg,
                                    endDtg: wizardScope.endDtg
                                };
                                cookies.put(COOKIES.time, 0, time, moment.utc().add(1, 'y'));
                                cookies.put(COOKIES.proximityMeters, 0, {proximityMeters: wizardScope.proximityMeters}, moment.utc().add(1, 'y'));
                                $rootScope.$emit('targetpri:request',
                                    {
                                        name: wizardScope.name,
                                        targetType: TT.route,
                                        rankTemplate: 'wps/routeRank_geojson.xml',
                                        startDtg: wizardScope.startDtg,
                                        endDtg: wizardScope.endDtg,
                                        proximityMeters: wizardScope.proximityMeters,
                                        targetFeature: wizardScope.geoFeature,
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
'ol3Map',
'stealth.core.geo.ol3.format.GeoJson',
'csvFormat',
'stealth.core.geo.ol3.utils.routeDrawHelper',
'stealth.targetpri.wizard.tpWizHelper',
function (ol3Map, GeoJson, csvFormat, routeDrawHelper, tpWizHelper) {
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
            var geoJsonFormat = new GeoJson(),
                fileInput = element.append('<input type="file" class="hidden">')[0].lastChild;
            //Couple FileReader to the hidden file input created above.
            FileReaderJS.setupInput(fileInput, {
                readAsDefault: 'Text',
                on: {
                    load: function (e, file) {
                        var feature = null;
                        fileInput.value = null;
                        switch (file.extra.extension.toLowerCase()) {
                            case 'json':
                                var pdFeaturesArr = geoJsonFormat.readFeatures(e.target.result);
                                if (pdFeaturesArr) {
                                    feature = new ol.Feature({
                                        pointData: {
                                            features: pdFeaturesArr,
                                            type: 'FeatureCollection'
                                        },
                                        geometry: new ol.geom.LineString([])
                                    });
                                    var featureCoords = feature.getGeometry().getCoordinates();
                                    _.each(pdFeaturesArr, function (pdFeat) {
                                        featureCoords.push(pdFeat.getGeometry().getCoordinates().slice(0));
                                    });
                                    feature.getGeometry().setCoordinates(featureCoords);
                                }
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
            _.merge(scope, tpWizHelper.drawCommon(scope, fileInput));
            scope.save = function (format) {
                if (scope.geoFeature && scope.geoFeature.getGeometry().getType() === 'LineString') {
                    var output = null,
                        type = 'text/plain';
                    switch (format) {
                        case 'json':
                            output = geoJsonFormat.writeFeatures(scope.geoFeature.get('pointData').features);
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
