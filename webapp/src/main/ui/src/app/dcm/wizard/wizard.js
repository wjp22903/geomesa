angular.module('stealth.dcm.wizard', [
    'stealth.core.startmenu'
])

.run([
'startMenuManager',
'dcmWizard',
function (startMenuManager, dcmWizard) {
    startMenuManager.addButton('Run Discrete Choice Model', 'fa-line-chart', dcmWizard.launch);
}])

.service('dcmWizard', [
'$log',
'$rootScope',
'$filter',
'ol3Map',
'wizardManager',
'colors',
'cqlHelper',
'stealth.core.geo.ol3.layers.MapLayer',
'stealth.core.wizard.Step',
'stealth.core.wizard.Wizard',
'stealth.core.utils.WidgetDef',
'owsLayers',
'wfs',
'CONFIG',
function ($log, $rootScope, $filter,
          ol3Map, wizardManager, colors, cqlHelper,
          MapLayer, Step, Wizard, WidgetDef, owsLayers, wfs, CONFIG) {
    var tag = 'stealth.dcm.wizard.dcmWizard: ';
    $log.debug(tag + 'service started');

    var catScope;

    this.setCategoryScope = function (scope) { catScope = scope; };

    var vectorPrefix = ['dcm', 'vector'];
    var rasterPrefix = ['dcm', 'raster'];
    var eventsPrefix = ['dcm', 'events'];

    var getFeatureTypeDescription = function (gsLayer) {
        wfs.getFeatureTypeDescription(CONFIG.geoserver.defaultUrl,
                                      gsLayer.Name,
                                      CONFIG.geoserver.omitProxy)
        .then(
            function (description) {
                if (angular.isString(description) && description.indexOf('Exception') !== -1) {
                    gsLayer.featureTypeDescription = "unavailable";
                } else {
                    gsLayer.featureTypeDescription = description;
                }
            }
        );

        wfs.getDefaultGeometryFieldName(CONFIG.geoserver.defaultUrl, gsLayer.Name, CONFIG.geoserver.omitProxy, true).
        then(
            function(defaultGeomFieldName) {
                if (angular.isString(defaultGeomFieldName) && defaultGeomFieldName.indexOf('Exception') !== -1) {
                    gsLayer.defaultGeomFieldName = "Unavailable";
                } else {
                    gsLayer.defaultGeomFieldName = defaultGeomFieldName;
                }
            }
        );
    };

    var dragBox = new ol.interaction.DragBox({
        style: new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: [204, 0, 153, 1]
            }),
            fill: new ol.style.Fill({
                color: [204, 0, 153, 0.5]
            })
        })
    });

    var ol3Layer = new ol.layer.Vector({
        source: getBoxSource({
            minLon: -180,
            maxLon: 180,
            minLat: -90,
            maxLat: 90
        }),
        style: new ol.style.Style({
            stroke: new ol.style.Stroke({color: [204, 0, 153, 1]}),
            fill: new ol.style.Fill({color: [255, 255, 255, 0.35]})
        })
    });

    var boxLayer = new MapLayer('Box', ol3Layer);


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

    function getBoxSource (params) {
        return new ol.source.Vector({
            features: [new ol.Feature({
                geometry: new ol.geom.Polygon(
                    [[[params.minLon, params.minLat],
                      [params.maxLon, params.minLat],
                      [params.maxLon, params.maxLat],
                      [params.minLon, params.maxLat],
                      [params.minLon, params.minLat]]]
                )
            })]
        });
    }

    this.launch = function () {
        var wizScope = $rootScope.$new();
        var steps = [];
        var predictiveFeaturesSelected = [];
        wizScope.vectorLayers = [];
        wizScope.rasterLayers = [];
        wizScope.eventLayers = [];

        owsLayers.getLayers(vectorPrefix, true)
            .then(function (layers) {
                $log.debug('owsLayers.getLayers()');
                _.each(layers, function (l) {
                    var gsLayer = _.cloneDeep(l);
                    gsLayer.derivedLayers = [];
                    gsLayer.cql_filter = null;
                    gsLayer.showAttributes = false;
                    getFeatureTypeDescription(gsLayer);
                    wizScope.vectorLayers.push(gsLayer);
                });
            });

        owsLayers.getLayers(rasterPrefix, true)
            .then(function (layers) {
                $log.debug('owsLayers.getLayers()');
                _.each(layers, function (l) {
                    var gsLayer = _.cloneDeep(l);
                    gsLayer.derivedLayers = [];
                    gsLayer.cql_filter = null;
                    wizScope.rasterLayers.push(gsLayer);
                });
            });

        owsLayers.getLayers(null, true)
            .then(function (layers) {
                $log.debug('owsLayers.getLayers()');
                _.each(layers, function (l) {
                    if (l.queryable) {
                        var gsLayer = _.cloneDeep(l);
                        gsLayer.derivedLayers = [];
                        gsLayer.cql_filter = null;
                        getFeatureTypeDescription(gsLayer);
                        wizScope.eventLayers.push(gsLayer);
                    }
                });
            });

        wizScope.vectorLayersSelected = [];
        wizScope.outputTypes = [
            {name: "tiff", output: "image/tiff"},
            {name: "arcgrid", output: "application/arcgrid"}
        ];

        wizScope.srsHandlingOptions = [
            {name: "Force Declared", projectionPolicy: "FORCE_DECLARED"},
            {name: "Reproject to Declared", projectionPolicy: "REPROJECT_TO_DECLARED"},
            {name: "None", projectionPolicy: "NONE"}
        ];

        wizScope.addToPredictiveFeatures = function(selectedLayers) {
            wizScope.prediction.predictiveFeatures = wizScope.prediction.predictiveFeatures.concat(angular.copy(selectedLayers));
            wizScope.prediction.predictiveFeatures.sort(function(a, b) {
                if (a.Name > b.Name) {
                    return 1;
                } else if (a.Name < b.Name) {
                    return -1;
                } else {
                    return 0;
                }
            });
        };

        wizScope.removeFromPredictiveFeatures = function(index) {
            wizScope.prediction.predictiveFeatures.splice(index, 1);
            wizScope.vectorLayers.sort(function(a, b) {
                if (a.Name > b.Name) {
                    return 1;
                } else if (a.Name < b.Name) {
                    return -1;
                } else {
                    return 0;
                }
            });
        };

        wizScope.updateEventCql = function(event) {
            wizScope.eventLayers.filter(function(ev) { return ev.Title == event.Title; })[0].cql_filter = event.cql_filter;
        };

        wizScope.prediction = {
            predictiveFeatures: [],
            predictiveCoverages: [],
            events: [],
            geometry: null,
            width: 800,
            height: 600,
            sampleRatio: 100,
            CRS: "EPSG:4326",
            featureSelection: true,
            outputType: wizScope.outputTypes[0],
            workspace: null,
            srsHandling: wizScope.srsHandlingOptions[2],
            keywords: "stealth.dcm.prediction, stealth.routeanalysis.data.Spatial Predictions",
            bounds: {
                minLon: -180,
                minLat: -90,
                maxLon: 180,
                maxLat: 90
            }
        };

        steps.push(new Step('Choose predictive features',
            new WidgetDef('st-dcm-wiz-predictive-features', wizScope),
            null,
            true)
        );

        steps.push(new Step('Choose predictive coverages',
            new WidgetDef('st-dcm-wiz-predictive-coverages', wizScope),
            null,
            true)
        );

        steps.push(new Step('Choose events to predict',
            new WidgetDef('st-dcm-wiz-events', wizScope),
            null,
            true)
        );

        steps.push(new Step('Define spatial extent',
            new WidgetDef('st-dcm-wiz-spatial-bounds', wizScope),
            null,
            false,
            // Setup function
            function (stepNum) {
                ol3Layer.setSource(getBoxSource(wizScope.prediction.bounds));
                ol3Map.addLayer(boxLayer);

                wizScope.$watchCollection('prediction.bounds', function (newParams, oldParams) {
                    ol3Layer.setSource(getBoxSource(newParams));
                });

                if (!wizScope.boundWiz) {
                    wizScope.boundWiz = {
                        drawing: false,
                        setWholeEarth: function () {
                            wizScope.prediction.bounds.minLon = -180;
                            wizScope.prediction.bounds.minLat = -90;
                            wizScope.prediction.bounds.maxLon = 180;
                            wizScope.prediction.bounds.maxLat = 90;
                            ol3Layer.setSource(getBoxSource(wizScope.prediction.bounds));
                        },
                        setMapExtent: function () {
                            var bounds = parseBounds(ol3Map.getExtent());
                            wizScope.prediction.bounds.minLon = bounds[0];
                            wizScope.prediction.bounds.minLat = bounds[1];
                            wizScope.prediction.bounds.maxLon = bounds[2];
                            wizScope.prediction.bounds.maxLat = bounds[3];
                            ol3Layer.setSource(getBoxSource(wizScope.prediction.bounds));
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
                        wizScope.prediction.bounds.minLon = bounds[0];
                        wizScope.prediction.bounds.minLat = bounds[1];
                        wizScope.prediction.bounds.maxLon = bounds[2];
                        wizScope.prediction.bounds.maxLat = bounds[3];
                        ol3Layer.setSource(getBoxSource(wizScope.prediction.bounds));
                        ol3Map.removeInteraction(dragBox);
                        wizScope.boundWiz.drawing = false;
                        wizardManager.showFooter();
                    });
                });
            },
            // Teardown function
            function (stepNum, success) {
                if (!_.isUndefined(wizScope.dragBoxListenerKey)) {
                    dragBox.unByKey(wizScope.dragBoxListenerKey);
                    delete wizScope.dragBoxListenerKey;
                }

                ol3Map.removeLayer(boxLayer);
            })
        );

        steps.push(new Step('Output options',
            new WidgetDef('st-dcm-wiz-output-options', wizScope),
            null,
            true,
            // Setup function
            function (stepNum) {},
            // Teardown function submits query.
            function (stepNum, success) {
                if (success) {
                    catScope.runDcmQuery(wizScope.prediction);
                }
            })
        );

        angular.extend(wizScope, {
            style: {
                'background-color': colors.getColor()
            }
        });

        var wiz = new Wizard('Spatial Prediction', 'fa-bar-chart', 'fa-check text-success', steps, wizScope, 'dcmWizardForm');
        wizardManager.launchWizard(wiz);
    };

}])

.service('threatSurfaceWizard', [
'$log',
'$rootScope',
'$filter',
'ol3Map',
'wizardManager',
'colors',
'cqlHelper',
'stealth.core.geo.ol3.layers.MapLayer',
'stealth.core.wizard.Step',
'stealth.core.wizard.Wizard',
'stealth.core.utils.WidgetDef',
'owsLayers',
'wfs',
'CONFIG',
function ($log, $rootScope, $filter,
          ol3Map, wizardManager, colors, cqlHelper,
          MapLayer, Step, Wizard, WidgetDef, owsLayers, wfs, CONFIG) {
    var tag = 'stealth.dcm.wizard.threatSurfaceWizard: ';
    $log.debug(tag + 'service started');

    var catScope;

    this.setCategoryScope = function (scope) { catScope = scope; };

    this.launch = function () {
        var wizScope = $rootScope.$new();
        var steps = [];
        var threatSurfacesSelected = [];
        var threatSurfacePrefix = ['dcm', 'prediction'];

        wizScope.threatSurfaces = [];

        owsLayers.getLayers(threatSurfacePrefix, true)
            .then(function (layers) {
                $log.debug('owsLayers.getLayers()');
                _.each(layers, function (l) {
                    var gsLayer = _.cloneDeep(l);
                    gsLayer.derivedLayers = [];
                    gsLayer.cql_filter = null;
                    gsLayer.showAttributes = false;
                    wizScope.threatSurfaces.push(gsLayer);
                });
            });

        wizScope.threatSurfacesSelected = [];
        wizScope.addThreatSurface = function(threatSurface) {
            catScope.addThreatSurfaces([threatSurface]);
        };

        steps.push(new Step('Choose Threat Surface',
            new WidgetDef('st-dcm-wiz-threat-surfaces', wizScope),
            null,
            false,
            // Setup function
            function (stepNum) {},
            // Teardown function submits query.
            function (stepNum, success) {
                if (success) {
                    catScope.addThreatSurfaces(wizScope.threatSurfacesSelected);
                }
            })
        );

        angular.extend(wizScope, {
            style: {
                'background-color': colors.getColor()
            }
        });

        var wiz = new Wizard('Add Threat Surface', 'fa-bar-chart', 'fa-check text-success', steps, wizScope);
        wizardManager.launchWizard(wiz);
    };

}])

.directive('stDcmWizPredictiveFeatures',
function () {
    return {
        restrict: 'E',
        templateUrl: 'dcm/wizard/templates/predictivefeatures.tpl.html'
    };
})

.directive('stDcmWizThreatSurfaces',
function () {
    return {
        restrict: 'E',
        templateUrl: 'dcm/wizard/templates/threatsurfaces.tpl.html'
    };
})

.directive('stDcmWizPredictiveCoverages',
function () {
    return {
        restrict: 'E',
        templateUrl: 'dcm/wizard/templates/predictivecoverages.tpl.html'
    };
})

.directive('stDcmWizEvents',
function () {
    return {
        restrict: 'E',
        templateUrl: 'dcm/wizard/templates/events.tpl.html'
    };
})

.directive('stDcmWizSpatialBounds',
function () {
    return {
        restrict: 'E',
        templateUrl: 'dcm/wizard/templates/spatialbounds.tpl.html'
    };
})

.directive('stDcmWizOutputOptions',
function () {
    return {
        restrict: 'E',
        templateUrl: 'dcm/wizard/templates/outputoptions.tpl.html'
    };
})

;
