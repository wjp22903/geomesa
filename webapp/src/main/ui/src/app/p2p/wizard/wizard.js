angular.module('stealth.p2p.wizard', [
    'stealth.core.startmenu'
])

.run([
'startMenuManager',
'p2pWizard',
function (startMenuManager, p2pWizard) {
    startMenuManager.addButton('Point2Point Wizard', 'fa-line-chart', p2pWizard.launch);
}])

.service('p2pWizard', [
'$log',
'$rootScope',
'$filter',
'toastr',
'ol3Map',
'wizardManager',
'stealth.core.wizard.Step',
'stealth.core.wizard.Wizard',
'stealth.core.utils.WidgetDef',
'stealth.p2p.geo.query.P2PQuery',
'wps',
'boundsHelper',
'CONFIG',
function ($log, $rootScope, $filter, toastr,
          ol3Map, wizardManager,
          Step, Wizard, WidgetDef, P2PQuery, wps, boundsHelper, CONFIG) {
    var tag = 'stealth.p2p.wizard.p2pWizard: ';
    $log.debug(tag + 'service started');

    var catScope;

    this.setCategoryScope = function (scope) { catScope = scope; };

    var dragBox = new ol.interaction.DragBox();

    function parseBounds (extent) {
        var filter = $filter('number');
        var trimmed = _.map(extent, function (val) {
            return parseFloat(filter(val, 5));
        });
        var bounds = [];
        bounds.push(trimmed[0] < -180 ? -180 : trimmed[0]);
        bounds.push(trimmed[1] < -90 ? -90 : trimmed[1]);
        bounds.push(trimmed[2] > 180 ? 180 : trimmed[2]);
        bounds.push(trimmed[3] > 90 ? 90 : trimmed[3]);
        return bounds;
    }

    this.launch = function () {
        var wizScope = $rootScope.$new();
        var steps = [];

        wizScope.p2pquery = new P2PQuery();

        var useMask = true;
        steps.push(new Step('Choose layer to analyze',
                            new WidgetDef('st-p2p-wiz-layer', wizScope),
                            null,
                            true,
                            null
                           ));

        steps.push(new Step('Define spatial extent',
                            new WidgetDef('st-p2p-wiz-spatial-bounds', wizScope),
                            null,
                            !useMask,
                            // Setup function
            function () {
                if (!wizScope.boundWiz) {
                    wizScope.boundWiz = {
                        drawing: false,
                        setWholeEarth: function () {
                            wizScope.p2pquery.params.minLon = -180;
                            wizScope.p2pquery.params.minLat = -90;
                            wizScope.p2pquery.params.maxLon = 180;
                            wizScope.p2pquery.params.maxLat = 90;
                        },
                        setEventBounds: function () {
                            var templateFn = stealth.jst['wps/bounds.xml'];
                            var req = templateFn({
                                layerName: wizScope.layer.Name
                            });
                            wps.submit(CONFIG.geoserver.defaultUrl, req, CONFIG.geoserver.omitProxy)
                                .then(function (result) {
                                    var bounds = boundsHelper.boundsFromXMLString(result);
                                    wizScope.p2pquery.params.minLon = bounds[0];
                                    wizScope.p2pquery.params.minLat = bounds[1];
                                    wizScope.p2pquery.params.maxLon = bounds[2];
                                    wizScope.p2pquery.params.maxLat = bounds[3];
                                }, function (reason) {
                                    toastr.error('Could not get events bounds. More details: ' + reason);
                                });
                        },
                        setMapExtent: function () {
                            var bounds = parseBounds(ol3Map.getExtent());
                            wizScope.p2pquery.params.minLon = bounds[0];
                            wizScope.p2pquery.params.minLat = bounds[1];
                            wizScope.p2pquery.params.maxLon = bounds[2];
                            wizScope.p2pquery.params.maxLat = bounds[3];
                        },
                        drawExtent: function () {
                            wizScope.boundWiz.drawing = true;
                            wizardManager.hideFooter();
                            ol3Map.addInteraction(dragBox);
                        }
                    };
                }

                wizScope.dragBoxListenerKey = dragBox.on('boxend', function () {
                    wizScope.$apply(function () {
                        var bounds = parseBounds(dragBox.getGeometry().getExtent());
                        wizScope.p2pquery.params.minLon = bounds[0];
                        wizScope.p2pquery.params.minLat = bounds[1];
                        wizScope.p2pquery.params.maxLon = bounds[2];
                        wizScope.p2pquery.params.maxLat = bounds[3];
                        ol3Map.removeInteraction(dragBox);
                        wizScope.boundWiz.drawing = false;
                        wizardManager.showFooter();
                    });
                });
            },
            // Teardown function
            function () {
                if (!_.isUndefined(wizScope.dragBoxListenerKey)) {
                    dragBox.unByKey(wizScope.dragBoxListenerKey);
                    delete wizScope.dragBoxListenerKey;
                }
            })
        );

        steps.push(new Step('Define time range',
            new WidgetDef('st-p2p-wiz-time-bounds', wizScope),
            null,
            useMask)
        );

        angular.extend(wizScope, {
            style: {
                'background-color': wizScope.p2pquery.params.lineColor
            }
        });

        steps.push(new Step('Set Options',
            new WidgetDef('st-p2p-wiz-options', wizScope),
            null,
            useMask,
            null,
             // Teardown function runs query
            function (success) {
                if (success) {
                    wizScope.p2pquery.params.lineColor = wizScope.style['background-color'];
                    catScope.runP2pQuery(wizScope.p2pquery);
                }
            })
        );

        var wiz = new Wizard('Point To Point Analysis', 'fa-line-chart', 'fa-check text-success', steps, wizScope, 'p2pWizardForm');
        wizardManager.launchWizard(wiz);
    };
}])

.directive('stP2pWizLayer',
function () {
    return {
        restrict: 'E',
        templateUrl: 'p2p/wizard/templates/source.tpl.html'
    };
})

.directive('stP2pWizSpatialBounds',
function () {
    return {
        restrict: 'E',
        templateUrl: 'p2p/wizard/templates/spatialbounds.tpl.html'
    };
})

.directive('stP2pWizTimeBounds',
function () {
    return {
        restrict: 'E',
        templateUrl: 'p2p/wizard/templates/timebounds.tpl.html'
    };
})

.directive('stP2pWizOptions',
function () {
    return {
        restrict: 'E',
        templateUrl: 'p2p/wizard/templates/options.tpl.html'
    };
})

;
