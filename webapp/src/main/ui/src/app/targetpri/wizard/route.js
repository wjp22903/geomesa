angular.module('stealth.targetpri.wizard.route')

.factory('routeTpWizFactory', [
'stealth.core.wizard.Wizard',
'stealth.core.wizard.Step',
'stealth.core.utils.WidgetDef',
'sidebarManager',
'ol3Map',
'elementAppender',
'routeDrawHelper',
function (Wizard, Step, WidgetDef, sidebarManager, ol3Map, elementAppender, routeDrawHelper) {
    var self = {
        createSourceWiz: function (wizardScope) {
            return new Wizard(null, null, 'fa-ellipsis-h', [
                new Step('Select route source', new WidgetDef('st-tp-wiz-source', wizardScope), null, true,
                    function (stepNum) {
                        this.setEndIconClass('fa-ellipsis-h');
                        this.truncateSteps(stepNum);
                    },
                    function (stepNum, success) {
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
                    }
                )
            ]);
        },
        createDrawWiz: function (wizardScope) {
            var featureOverlay = new ol.FeatureOverlay({
                features: wizardScope.geoFeature ? [wizardScope.geoFeature] : [],
                style: [
                    new ol.style.Style({
                        stroke: new ol.style.Stroke({color: '#FFFFFF', width: 5})
                    }),
                    new ol.style.Style({
                        stroke: new ol.style.Stroke({color: '#000000', width: 4})
                    }),
                    new ol.style.Style({
                        stroke: new ol.style.Stroke({color: '#CC0099', width: 3})
                    })
                ]
            });
            var modify = new ol.interaction.Modify({
                features: featureOverlay.getFeatures(),
                //require SHIFT key to delete vertices
                deleteCondition: function (event) {
                    return ol.events.condition.shiftKeyOnly(event) &&
                        ol.events.condition.singleClick(event);
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
                    ol3Map.addOverlay(featureOverlay);
                    ol3Map.addInteraction(modify);
                    ol3Map.addInteraction(draw);
                    elementAppender.append('.primaryDisplay',
                        'targetpri/wizard/templates/routePoints.tpl.html', wizardScope,
                        function (val) { routeInfoPanel = val; }
                    );
                }, function (stepNum, success) {
                    if (routeInfoPanel) {
                        routeInfoPanel.remove();
                    }
                    ol3Map.removeInteraction(draw);
                    ol3Map.removeInteraction(modify);
                    ol3Map.removeOverlay(featureOverlay);
                })
            ]);
        },
        createEndWiz: function (wizardScope) {
            var now = moment.utc();
            wizardScope.startDtg = now.clone().subtract(7, 'days');
            wizardScope.endDtg = now;
            return new Wizard(null, null, 'fa-check text-success', [
                new Step('Select data', new WidgetDef('st-tp-wiz-data', wizardScope), null, true),
                new Step('Set options', new WidgetDef('st-tp-route-options-wiz', wizardScope), null, true, null, function (stepNum, success) {
                    if (success) {
                        sidebarManager.toggleButton(
                            sidebarManager.addButton(wizardScope.name, 'fa-crosshairs', 300, new WidgetDef('st-placeholder', wizardScope)),
                            true);
                    }
                })
            ]);
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
'csvFormat',
'routeDrawHelper',
function ($timeout, ol3Map, csvFormat, routeDrawHelper) {
    return {
        restrict: 'E',
        scope: {
            featureOverlay: '=',
            geoFeature: '=',
            routeInfo: '=',
            source: '='
        },
        templateUrl: 'targetpri/wizard/templates/drawTools.tpl.html',
        link: function (scope, element, attrs) {
            var geoJsonFormat = new ol.format.GeoJSON();
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
                                ol3Map.fitExtent(feature.getGeometry().getExtent());
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

.service('routeDrawHelper', [
'$filter',
'$timeout',
function ($filter, $timeout) {
    this.initFeature = function (feature, scope, moreInit) {
        feature.on('change', function (evt2) {
            var coords = evt2.target.getGeometry().getCoordinates();
            $timeout(function () {
                scope.routeInfo.coords = coords;
                scope.routeInfo.meters = $filter('distanceVincenty')(coords);
            });
            var newPointData = {
                type: 'FeatureCollection',
                features: []
            };
            _.each(evt2.target.getGeometry().getCoordinates(), function (coord, index) {
                var id = _.now() + '_' + index;
                var newPoint = {
                        id: id,
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'Point',
                            coordinates: coord
                        }
                    },
                    oldPoint = _.find(evt2.target.get('pointData').features, {id: id});
                if (oldPoint) {
                    newPoint.properties = oldPoint.properties;
                }
                newPointData.features.push(newPoint);
            });
            evt2.target.set('pointData', newPointData);
        });
        $timeout(function () {
            var coords = feature.getGeometry().getCoordinates();
            scope.routeInfo = {
                coords: coords,
                meters: $filter('distanceVincenty')(coords)
            };
            if (!feature.get('pointData')) {
                feature.set('pointData', {
                    type: 'FeatureCollection',
                    features: []
                });
                _.each(coords, function (coord, index) {
                    feature.get('pointData').features.push({
                        id: _.now() + '_' + index,
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'Point',
                            coordinates: coord
                        }
                    });
                });
            }
            scope.geoFeature = feature;

            if (_.isFunction(moreInit)) {
                moreInit();
            }
        });
    };
}])
;
