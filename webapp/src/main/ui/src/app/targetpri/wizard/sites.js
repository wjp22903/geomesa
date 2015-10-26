angular.module('stealth.targetpri.wizard.sites', [
    'stealth.core.geo.ol3.format',
    'stealth.core.geo.ol3.utils',
    'stealth.core.utils',
    'stealth.core.utils.cookies'
])

.factory('stealth.targetpri.wizard.sites.sitesTpWizFactory', [
'$rootScope',
'cookies',
'stealth.core.geo.ol3.interaction.standard',
'stealth.core.geo.ol3.overlays.Vector',
'stealth.core.wizard.Wizard',
'stealth.core.wizard.Step',
'stealth.core.utils.WidgetDef',
'ol3Map',
'elementAppender',
'stealth.core.geo.ol3.utils.sitesDrawHelper',
'stealth.core.geo.ol3.utils.numberDotStyle',
'stealth.targetpri.runner.TargetType',
'stealth.targetpri.wizard.TargetpriCookies',
function ($rootScope, cookies, ol3Interaction, VectorOverlay, Wizard, Step, WidgetDef, ol3Map, elementAppender,
        sitesDrawHelper, numberDotStyle, TT, COOKIES) {
    var self = {
        createDrawWiz: function (wizardScope) {
            var featureOverlay = new VectorOverlay({
                colors: ['#CC0099'],
                styleBuilder: function (color, feature) { //eslint-disable-line no-unused-vars
                    return numberDotStyle.style()(feature);
                }
            });
            var modify = ol3Interaction.getModify(featureOverlay.getFeatures());
            var draw = new ol.interaction.Draw({
                features: featureOverlay.getFeatures(),
                type: 'Point'
            });
            var sitesInfoPanel = null;
            wizardScope.sitesInfo = {
                nameCounter: 1
            };
            wizardScope.featureOverlay = featureOverlay;
            if (wizardScope.geoFeature) {
                var names = [];
                _.each(wizardScope.geoFeature.getArray(), function (featurePoint) {
                    featureOverlay.addFeature(featurePoint);
                    names.push(parseInt(featurePoint.get('name'), 10));
                });
                names.sort(function (a, b) { return a - b; });
                wizardScope.sitesInfo.nameCounter = parseInt(names[names.length - 1], 10) + 1;
                wizardScope.geoFeature = featureOverlay.getFeatures();
                wizardScope.sitesInfo.pdFeatures = wizardScope.geoFeature;
            }
            draw.on('drawstart', function (event) {
                sitesDrawHelper.initFeature(featureOverlay.getFeatures(), wizardScope);
                wizardScope.$apply(function () {
                    event.feature.set('name', "" + wizardScope.sitesInfo.nameCounter);
                    event.feature.set('id', _.now() + '_' + wizardScope.sitesInfo.nameCounter++);
                });
                event.feature.on('change', function () {
                    this.$apply(_.noop());
                }, wizardScope);
            });
            return new Wizard(null, null, null, [
                new Step('Define sites', new WidgetDef('st-tp-wiz-draw', wizardScope),
                        // ref: st-tp-sites-draw-tools == stTpSitesDrawTools declared in this file
                        new WidgetDef('st-tp-sites-draw-tools', wizardScope, "feature-overlay='featureOverlay' geo-feature='geoFeature' sites-info='sitesInfo' source='source'"),
                        false,
                        // setup function:
                        function () {
                            if (!wizardScope.geoFeature) {
                                sitesDrawHelper.initFeature(featureOverlay.getFeatures(), wizardScope);
                            }
                            featureOverlay.addToMap();
                            ol3Map.addInteraction(modify);
                            ol3Map.addInteraction(draw);
                            elementAppender.append('.primaryDisplay',
                                'targetpri/wizard/templates/sitesPoints.tpl.html', wizardScope,
                                function (val) { sitesInfoPanel = val; }
                            );
                        },
                        // teardown function:
                        function () {
                            if (sitesInfoPanel) {
                                sitesInfoPanel.remove();
                            }
                            ol3Map.removeInteraction(modify);
                            ol3Map.removeInteraction(draw);
                            featureOverlay.removeFromMap();
                            if (wizardScope.geoFeature) {
                                sitesDrawHelper.detachFeature(wizardScope.geoFeature);
                            }
                        })
            ]);
        },
        createEndWiz: function (wizardScope) {
            var now = moment.utc();
            wizardScope.proximityMeters = 5000;
            wizardScope.weights = {
                uniquenessWeight: 3,
                durationWeight: 3,
                prevalenceWeight: 3,
                proximityWeight: 3
            };
            wizardScope.startDtg = now.clone().subtract(7, 'days');
            wizardScope.endDtg = now;
            _.merge(wizardScope,
                _.mapValues(cookies.get(COOKIES.time, 0), function (time) {
                    return time ? moment.utc(time) : null;
                }),
                cookies.get(COOKIES.proximityMeters, 0),
                cookies.get(COOKIES.weights, 0)
            );

            return new Wizard(
                null,
                null,
                'fa-check text-success',
                [
                    new Step('Select data', new WidgetDef('st-tp-wiz-data', wizardScope), null, true),
                    new Step(
                        'Set options',
                        new WidgetDef('st-tp-sites-options-wiz', wizardScope),
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
                                cookies.put(COOKIES.weights, 0, {weights: wizardScope.weights}, moment.utc().add(1, 'y'));
                                $rootScope.$emit('targetpri:request',
                                    {
                                        name: wizardScope.name,
                                        targetType: TT.sites,
                                        rankTemplate: 'wps/sitesRank_geojson.xml',
                                        startDtg: wizardScope.startDtg,
                                        endDtg: wizardScope.endDtg,
                                        proximityMeters: wizardScope.proximityMeters,
                                        weights: wizardScope.weights,
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

.directive('stTpSitesOptionsWiz', [
function () {
    return {
        restrict: 'E',
        replace: true,
        templateUrl: 'targetpri/wizard/templates/sitesOptions.tpl.html'
    };
}])

.directive('stTpSitesDrawTools', [
'ol3Map',
'stealth.core.geo.ol3.format.GeoJson',
'csvFormat',
'stealth.core.geo.ol3.utils.sitesDrawHelper',
'stealth.targetpri.wizard.tpWizHelper',
function (ol3Map, GeoJson, csvFormat, sitesDrawHelper, tpWizHelper) {
    return {
        restrict: 'E',
        scope: {
            featureOverlay: '=',
            geoFeature: '=',
            sitesInfo: '=',
            source: '='
        },
        templateUrl: 'targetpri/wizard/templates/drawTools.tpl.html',
        link: function (scope, element) {
            var geoJsonFormat = new GeoJson(); // stealth GeoJson, extending OL3 for STEALTH-319
            var fileInput = element.append('<input type="file" class="hidden">')[0].lastChild;
            FileReaderJS.setupInput(fileInput, {
                readAsDefault: 'Text',
                on: {
                    load: function (e, file) {
                        fileInput.value = null;
                        var feature = null;
                        switch (file.extra.extension.toLowerCase()) {
                            case 'json':
                                feature = geoJsonFormat.readFeatures(e.target.result);
                                break;
                            case 'csv':
                                feature = csvFormat.csvToFeatures(e.target.result, 'LineString', csvFormat.coordFormat.dmshCombined, ['DMS'])[0];
                                feature = feature.get('pointData').features;
                                break;
                            default:
                                return;
                        }
                        if (_.isArray(feature)) {
                            sitesDrawHelper.initFeature(feature, scope, function () {
                                var coords = [];
                                scope.featureOverlay.getFeatures().clear();
                                _.each(feature, function (pointFeature) {
                                    coords.push(pointFeature.getGeometry().getCoordinates());
                                    scope.featureOverlay.addFeature(pointFeature);
                                });
                                var featureCollection = new ol.Feature({
                                    pointData: {
                                        features: scope.geoFeature.getArray(),
                                        type: 'FeatureCollection'
                                    },
                                    geometry: new ol.geom.MultiPoint(coords)
                                });
                                scope.geoFeature = scope.featureOverlay.getFeatures();
                                ol3Map.fit(featureCollection.getGeometry().getExtent());
                            });
                        }
                    }
                }
            });
            _.merge(scope, tpWizHelper.drawCommon(scope, fileInput));
            scope.save = function (format) {
                if (scope.geoFeature) {
                    var output = null,
                        type = 'text/plain',
                        coords = [];
                    _.each(scope.geoFeature.getArray(), function (feature) {
                        coords.push(feature.getGeometry().getCoordinates());
                    });
                    var feature = new ol.Feature({
                        pointData: {
                            features: scope.geoFeature.getArray(),
                            type: 'FeatureCollection'
                        },
                        geometry: new ol.geom.MultiPoint(coords)
                    });
                    switch (format) {
                        case 'json':
                            output = geoJsonFormat.writeFeatures(scope.geoFeature.getArray());
                            type = 'application/json';
                            break;
                        case 'csv':
                            output = csvFormat.geoJsonToCsv(geoJsonFormat.writeFeatureObject(feature),
                                csvFormat.coordFormat.dmshCombined, ['DMS']);
                            type = 'text/csv';
                            break;
                    }
                    var blob = new Blob([output], {type: type});
                    saveAs(blob, 'sites.' + format);
                }
            };
            if (scope.source === 'file') {
                scope.upload();
            }
        }
    };
}])
;
