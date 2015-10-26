angular.module('stealth.targetpri.wizard.track', [
    'stealth.core.geo.ol3.format',
    'stealth.core.geo.ol3.geodetics',
    'stealth.core.geo.ol3.utils'
])

.factory('stealth.targetpri.wizard.track.trackTpWizFactory', [
'$rootScope',
'cookies',
'stealth.core.geo.ol3.overlays.Vector',
'stealth.core.wizard.Wizard',
'stealth.core.wizard.Step',
'stealth.core.utils.keyboard',
'stealth.core.utils.WidgetDef',
'ol3Map',
'ol3Styles',
'elementAppender',
'stealth.core.geo.ol3.utils.trackDrawHelper',
'stealth.targetpri.runner.TargetType',
'stealth.targetpri.wizard.TargetpriCookies',
function ($rootScope, cookies, VectorOverlay, Wizard, Step, keyboard, WidgetDef, ol3Map, ol3Styles,
        elementAppender, trackDrawHelper, TT, COOKIES) {
    var self = {
        createDrawWiz: function (wizardScope) {
            var featureOverlay = new VectorOverlay({
                colors: ['#CC0099'],
                styleBuilder: _.curry(ol3Styles.getLineStyle)(3)
            });
            if (wizardScope.geoFeature) {
                featureOverlay.addFeature(wizardScope.geoFeature);
            }
            // custom Modify without ability to delete
            var modify = new ol.interaction.Modify({
                features: featureOverlay.getFeatures()
            });
            modify.on('change:active', function () {
                if (modify.getActive()) {
                    keyboard.listen();
                } else {
                    keyboard.unlisten();
                }
            });
            var draw = new ol.interaction.Draw({
                features: featureOverlay.getFeatures(),
                type: 'LineString'
            });
            draw.on('drawstart', function (evt) {
                wizardScope.$apply(function () {
                    if (wizardScope.geoFeature) {
                        draw.finishDrawing();
                    } else {
                        trackDrawHelper.initFeature(evt.feature, wizardScope);
                    }
                });
            });
            // drawend event listener to truncate pointData to coords length
            draw.on('drawend', function (evt) {
                if (evt.feature.get('pointData')) {
                    wizardScope.$apply(function () {
                        wizardScope.trackInfo.pdFeatures = _.slice(wizardScope.trackInfo.pdFeatures, 0, evt.feature.getGeometry().getCoordinates().length);
                        evt.feature.get('pointData').features = wizardScope.trackInfo.pdFeatures;
                        wizardScope.geoFeature = evt.feature;
                    });
                }
            });
            var trackInfoPanel = null; // track info panel is the trackPoints.tpl.html side panel that comes up when drawing the track
            wizardScope.featureOverlay = featureOverlay;
            wizardScope.updateAvgSpeed = function () {
                trackDrawHelper.updateAvgSpeed(wizardScope);
            };
            wizardScope.dtgChanged = function (pdFeature) {
                pdFeature.set('dtg', pdFeature.linkDtg);
                if (moment.isMoment(pdFeature.get('dtg')) && pdFeature.get('dtg').isValid()) {
                    // dtg was changed, so set isInterpolated to false.  If the change was made programmatically, the program will set dtgIsInterpolated to true
                    pdFeature.set('dtgIsInterpolated', false);
                }
            };
            wizardScope.interpolateTimes = function () {
                wizardScope.trackInfo.interpolationError = trackDrawHelper.interpolateTimes(wizardScope.geoFeature.get('pointData').features, wizardScope.geoFeature.getGeometry().getCoordinates());
                trackDrawHelper.updateAvgSpeed(wizardScope);
            };
            return new Wizard(null, null, null, [
                new Step('Define track', new WidgetDef('st-tp-wiz-draw', wizardScope), //ref: st-tp-wiz-draw == stTpWizDraw declared in targetpri/wizard/wizard.js
                        // ref: st-tp-track-draw-tools == stTpTrackDrawTools declared in this file
                        new WidgetDef('st-tp-track-draw-tools', wizardScope, "feature-overlay='featureOverlay' geo-feature='geoFeature' track-info='trackInfo' source='source'"),
                        false,
                        // setup function:
                        function () {
                            if (wizardScope.geoFeature) {
                                trackDrawHelper.initFeature(wizardScope.geoFeature, wizardScope);
                            }
                            featureOverlay.addToMap();
                            ol3Map.addInteraction(modify);
                            ol3Map.addInteraction(draw);
                            elementAppender.append('.primaryDisplay',
                                'targetpri/wizard/templates/trackPoints.tpl.html', wizardScope,
                                function (val) { trackInfoPanel = val; }
                            );
                        },
                        // teardown function:
                        function () {
                            if (trackInfoPanel) {
                                trackInfoPanel.remove();
                            }
                            ol3Map.removeInteraction(draw);
                            ol3Map.removeInteraction(modify);
                            featureOverlay.removeFromMap();
                            if (wizardScope.geoFeature) {
                                trackDrawHelper.detachFeature(wizardScope.geoFeature);
                            }
                        })
            ]);
        },
        createEndWiz: function (wizardScope) {
            wizardScope.proximityMeters = 2000;
            _.merge(wizardScope,
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
                        new WidgetDef('st-tp-track-options-wiz', wizardScope),
                        null,
                        true,
                        null,
                        function (success) {
                            if (success) {
                                //Save search properties in a cookie - expires in a year
                                cookies.put(COOKIES.proximityMeters, 0, {proximityMeters: wizardScope.proximityMeters}, moment.utc().add(1, 'y'));
                                $rootScope.$emit('targetpri:request',
                                    {
                                        name: wizardScope.name,
                                        targetType: TT.track,
                                        rankTemplate: 'wps/trackRank_geojson.xml',
                                        trackInfo: wizardScope.trackInfo,
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

.directive('stTpTrackOptionsWiz', [
function () {
    return {
        restrict: 'E',
        replace: true,
        templateUrl: 'targetpri/wizard/templates/trackOptions.tpl.html'
    };
}])

.directive('stTpTrackDrawTools', [
'ol3Map',
'stealth.core.geo.ol3.format.GeoJson',
'csvFormat',
'stealth.core.geo.ol3.utils.trackDrawHelper',
'stealth.targetpri.wizard.tpWizHelper',
function (ol3Map, GeoJson, csvFormat, trackDrawHelper, tpWizHelper) {
    return {
        restrict: 'E',
        scope: {
            featureOverlay: '=',
            geoFeature: '=',
            trackInfo: '=',
            source: '='
        },
        templateUrl: 'targetpri/wizard/templates/drawTools.tpl.html',
        link: function (scope, element, attrs) { //eslint-disable-line no-unused-vars
            var geoJsonFormat = new GeoJson(),
                fileInput = element.append('<input type="file" class="hidden">')[0].lastChild;
            FileReaderJS.setupInput(fileInput, {
                readAsDefault: 'Text',
                on: {
                    load: function (e, file) {
                        fileInput.value = null;
                        var feature = null;
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
                                    _.each(pdFeaturesArr, function (pdFeat) {
                                        var theCoords = feature.getGeometry().getCoordinates();
                                        theCoords.push(pdFeat.getGeometry().getCoordinates().slice(0));
                                        feature.getGeometry().setCoordinates(theCoords);
                                    });
                                }
                                break;
                            case 'csv':
                                // extract the coord header column name to pass to csvToFeatures(), along with the coord format constant
                                var coordHeader = _.filter(e.target.result.split('\n')[0].split(','), function (h) { return h === "DMS" || h === "DD"; }),
                                    coordFormat = {
                                        'DMS': csvFormat.coordFormat.dmshCombined,
                                        'DD': csvFormat.coordFormat.ddCombined
                                    };
                                if (coordHeader.length === 1) {
                                    feature = csvFormat.csvToFeatures(e.target.result, 'LineString', coordFormat[coordHeader[0]], coordHeader)[0];
                                }
                                break;
                            default:
                                return;
                        }
                        if (feature && feature.getGeometry().getType() === 'LineString') {
                            trackDrawHelper.loadFeature(feature, scope);
                            ol3Map.fit(feature.getGeometry());
                        }
                    }
                }
            });
            // merge in erase() and upload()
            _.merge(scope, tpWizHelper.drawCommon(scope, fileInput));
            scope.save = function (format) {
                if (scope.geoFeature && scope.geoFeature.getGeometry().getType() === 'LineString') {
                    var output = null,
                        type = 'text/plain';
                    switch (format) {
                        case 'json':
                            var features = [];
                            _.each(scope.geoFeature.get('pointData').features, function (pdFeature) {
                                features.push(new ol.Feature({
                                    id: pdFeature.get('id'),
                                    dtg: pdFeature.get('dtg').toISOString(),
                                    dtgIsInterpolated: pdFeature.get('dtgIsInterpolated'),
                                    geometry: new ol.geom.Point(pdFeature.getGeometry().getCoordinates())
                                }));
                            });
                            output = geoJsonFormat.writeFeatures(features);
                            type = 'application/json';
                            break;
                        case 'csv':
                            output = csvFormat.geoJsonToCsv(geoJsonFormat.writeFeatureObject(scope.geoFeature),
                                csvFormat.coordFormat.dmshCombined, ['DMS']);
                            type = 'text/csv';
                            break;
                    }
                    var blob = new Blob([output], {type: type});
                    saveAs(blob, 'track.' + format);
                }
            };
            if (scope.source === 'file') {
                scope.upload();
            }
        }
    };
}])
;
