angular.module('stealth.targetpri.wizard.route', [
])

.factory('routeTpWizFactory', [
'stealth.core.wizard.Wizard',
'stealth.core.wizard.Step',
'stealth.core.utils.WidgetDef',
'sidebarManager',
'ol3Map',
function (Wizard, Step, WidgetDef, sidebarManager, ol3Map) {
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
                                    //TODO
                                    break;
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
            draw.on('drawstart', function () {featureOverlay.getFeatures().clear();});
            draw.on('drawend', function (evt) {
                wizardScope.$apply(function () {
                    wizardScope.geoFeature = evt.feature;
                });
            });
            return new Wizard(null, null, null, [
                new Step('Draw route', new WidgetDef('st-tp-wiz-draw', wizardScope), null, false, function () {
                    ol3Map.addOverlay(featureOverlay);
                    ol3Map.addInteraction(modify);
                    ol3Map.addInteraction(draw);
                }, function (stepNum, success) {
                    ol3Map.removeInteraction(draw);
                    ol3Map.removeInteraction(modify);
                    ol3Map.removeOverlay(featureOverlay);
                })
            ]);
        },
        createEndWiz: function (wizardScope) {
            return new Wizard(null, null, 'fa-check text-success', [
                new Step('Select data', new WidgetDef('st-placeholder', wizardScope), null, true),
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
;
