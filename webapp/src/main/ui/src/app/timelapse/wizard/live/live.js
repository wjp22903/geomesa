angular.module('stealth.timelapse.wizard.live', [
    'stealth.core.startmenu',
    'stealth.core.wizard',
    'stealth.timelapse.wizard.options'
])

.run([
'startMenuManager',
'liveWizard',
function (startMenuManager, liveWizard) {
    startMenuManager.addButton('Live Data Query', 'fa-clock-o', liveWizard.launchWizard);
}])

.service('liveWizard', [
'$rootScope',
'wizardManager',
'ol3Map',
'ol3Styles',
'stealth.core.wizard.Wizard',
'stealth.core.wizard.Step',
'stealth.core.utils.WidgetDef',
'stealth.timelapse.wizard.live.Query',
function ($rootScope, wizardManager, ol3Map, ol3Styles, Wizard, Step, WidgetDef, Query) {
    var _self = this;
    this.launchWizard = function (queryOverrides, onSuccess) {
        var wizardScope = $rootScope.$new();
        wizardScope.query = new Query(queryOverrides);

        var _overlay = new ol.FeatureOverlay({
            features: wizardScope.query.params.geoFeature ? [wizardScope.query.params.geoFeature] : [],
            style: ol3Styles.getPolyStyle(1, '#CC0099')
        });

        var _draw = new ol.interaction.Draw({
            features: _overlay.getFeatures(),
            type: 'Polygon'
        });
        _draw.on('drawstart', function (evt) {
            wizardScope.$apply(function () {
                if (wizardScope.query.params.geoFeature) {
                    _draw.finishDrawing();
                } else {
                    wizardScope.query.params.geoFeature = evt.feature;
                }
            });
        });

        var _modify = new ol.interaction.Modify({
            features: _overlay.getFeatures(),
            //require ALT key to delete vertices
            deleteCondition: function (event) {
                return ol.events.condition.altKeyOnly(event) &&
                    ol.events.condition.singleClick(event);
            }
        });

        wizardScope.featureOverlay = _overlay;
        var baseWizard = new Wizard('Live Data Query', 'fa-clock-o', 'fa-check text-success', [
            new Step('Select data source and search area', new WidgetDef('st-live-wiz-source-and-area', wizardScope),
                     new WidgetDef('st-live-draw-tools', wizardScope, "feature-overlay='featureOverlay' geo-feature='query.params.geoFeature'"),
                     false, function () {
                ol3Map.addOverlay(_overlay);
                ol3Map.addInteraction(_draw);
                ol3Map.addInteraction(_modify);
            }, function () {
                wizardScope.query.saveSearchAreaCookie();
                ol3Map.removeInteraction(_modify);
                ol3Map.removeInteraction(_draw);
                ol3Map.removeOverlay(_overlay);
            }),
            new Step('Set Options', new WidgetDef('st-tl-wiz-options', wizardScope), null, true, null, function (stepNum, success) {
                if (success && _.isFunction(onSuccess)) {
                    onSuccess.call(this, wizardScope.query.layerData.currentLayer, wizardScope.query.buildCql(), wizardScope.query.params.storeName);
                }
            })
        ], wizardScope);
        wizardManager.launchWizard(baseWizard);
    };
    $rootScope.$on('Launch Live Wizard', function (event, queryOverrides) {
        _self.launchWizard(queryOverrides);
    });
}])

.directive('stLiveWizSourceAndArea',
function () {
    return {
        restrict: 'E',
        templateUrl: 'timelapse/wizard/live/source_area.tpl.html'
    };
})

.directive('stLiveDrawTools', [
'stealth.core.geo.ol3.format.GeoJson',
function (GeoJson) {
    var geoJsonFormat = new GeoJson(); // stealth GeoJson, extending OL3 for STEALTH-319
    return {
        restrict: 'E',
        scope: {
            featureOverlay: '=',
            geoFeature: '='
        },
        templateUrl: 'timelapse/wizard/live/drawTools.tpl.html',
        link: function (scope, element, attrs) {
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
                            default:
                                return;
                        }
                        if (feature && feature.getGeometry().getType() === 'Polygon') {
                            scope.geoFeature = feature;
                            scope.featureOverlay.addFeature(feature);
                        }
                    }
                }
            });

            scope.erase = function () {
                scope.$evalAsync(function () {
                    scope.geoFeature = null;
                    scope.featureOverlay.getFeatures().clear();
                });
            };

            scope.upload = function () {
                scope.$evalAsync(function () {
                    fileInput.click();
                });
            };

            scope.save = function (format) {
                if (scope.geoFeature && scope.geoFeature.getGeometry().getType() === 'Polygon') {
                    var output = null,
                        type = 'text/plain';
                    switch (format) {
                        case 'json':
                            output = geoJsonFormat.writeFeature(scope.geoFeature);
                            type = 'application/json';
                            break;
                    }
                    var blob = new Blob([output], {type: type});
                    saveAs(blob, 'area.' + format);
                }
            };
        }
    };
}])
;
