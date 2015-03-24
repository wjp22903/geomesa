angular.module('stealth.histogram.wizard')

.service('histogramWizard', [
'$log',
'$rootScope',
'$filter',
'ol3Map',
'wizardManager',
'colors',
'stealth.core.geo.ol3.layers.MapLayer',
'stealth.core.wizard.Step',
'stealth.core.wizard.Wizard',
'stealth.core.utils.WidgetDef',
function ($log, $rootScope, $filter,
          ol3Map, wizardManager, colors,
          MapLayer, Step, Wizard, WidgetDef) {
    var tag = 'stealth.histogram.wizard.histogramWizard: ';
    $log.debug(tag + 'service started');

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
        return new ol.source.GeoJSON({
            object: {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[params.minLon, params.minLat],
                                     [params.maxLon, params.minLat],
                                     [params.maxLon, params.maxLat],
                                     [params.minLon, params.maxLat],
                                     [params.minLon, params.minLat]]]
                }
            }
        });
    }

    function buildCQLFilter(query) {
        var cql_filter =
            'BBOX(' + query.params.geomField.name + ',' +
            query.params.minLon + ',' + query.params.minLat + ',' +
            query.params.maxLon + ',' + query.params.maxLat + ')' +
            ' AND ' + query.params.dtgField.name + ' DURING ' +
            query.params.startDtg.format('YYYY-MM-DD[T]HH:mm:ss[Z]') +
            '/' +
            query.params.endDtg.format('YYYY-MM-DD[T]HH:mm:ss[Z]');
        if (query.params.cql) {
            cql_filter += ' AND ' + query.params.cql;
        }
        return cql_filter;
    }

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

    var catScope;

    this.setCategoryScope = function (scope) { catScope = scope; };


    this.launch = function (fromName, query) {
        var wizScope = $rootScope.$new();
        var steps = [];

        wizScope.query = query;
        var sorted = _.sortBy(wizScope.query.featureTypeData.featureTypes[0].properties, function (p) {
            return p.name;
        });
        wizScope.query.params.attribute = sorted[0];
        wizScope.query.params.fromName = fromName;

        var useMask = true;

        steps.push(new Step('Choose attribute',
            new WidgetDef('st-histogram-wiz-source', wizScope),
            null,
            useMask)
        );

        steps.push(new Step('Define spatial extent',
            new WidgetDef('st-histogram-wiz-spatial-bounds', wizScope),
            null,
            !useMask,
            // Setup function
            function (stepNum) {
                ol3Layer.setSource(getBoxSource(wizScope.query.params));
                ol3Map.addLayer(boxLayer);

                wizScope.$watchCollection('query.params', function (newParams, oldParams) {
                    ol3Layer.setSource(getBoxSource(newParams));
                });

                if (!wizScope.boundWiz) {
                    wizScope.boundWiz = {
                        drawing: false,
                        setWholeEarth: function () {
                            wizScope.query.params.minLon = -180;
                            wizScope.query.params.minLat = -90;
                            wizScope.query.params.maxLon = 180;
                            wizScope.query.params.maxLat = 90;
                            ol3Layer.setSource(getBoxSource(wizScope.query.params));
                        },
                        setMapExtent: function () {
                            var bounds = parseBounds(ol3Map.getExtent());
                            wizScope.query.params.minLon = bounds[0];
                            wizScope.query.params.minLat = bounds[1];
                            wizScope.query.params.maxLon = bounds[2];
                            wizScope.query.params.maxLat = bounds[3];
                            ol3Layer.setSource(getBoxSource(wizScope.query.params));
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
                        wizScope.query.params.minLon = bounds[0];
                        wizScope.query.params.minLat = bounds[1];
                        wizScope.query.params.maxLon = bounds[2];
                        wizScope.query.params.maxLat = bounds[3];
                        ol3Layer.setSource(getBoxSource(wizScope.query.params));
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

        steps.push(new Step('Define time range',
            new WidgetDef('st-histogram-wiz-time-bounds', wizScope),
            null,
            useMask)
        );

        angular.extend(wizScope, {
            style: {
                'background-color': colors.getColor()
            }
        });
        wizScope.query.params.fillColor = wizScope.style['background-color'];

        steps.push(new Step('Set options',
            new WidgetDef('st-histogram-wiz-options', wizScope),
            null,
            useMask,
            // Setup function
            function (stepNum) {
                ol3Map.addLayer(boxLayer);
                wizScope.query.params.title =
                    "Histogram of '" + wizScope.query.params.attribute.name +
                    "' for '" + wizScope.query.params.fromName + "'";
            },
            // Teardown function submits query.
            function (stepNum, success) {
                ol3Map.removeLayer(boxLayer);

                if (success) {
                    wizScope.query.params.cqlFilter = buildCQLFilter(wizScope.query);
                    var derivedLayer = {
                        title: wizScope.query.params.title,
                        query: wizScope.query,
                        viewState: {
                            isOnMap: false,
                            toggledOn: false,
                            isLoading: false,
                            isRemovable: true,
                            fillColor: wizScope.query.params.fillColor
                        }
                    };

                    if (!_.isUndefined(catScope)) {
                        var workspaces = catScope.workspaces;
                        _.each(catScope.workspaces, function (ws) {
                            var gsLayer = _.find(ws, function (lyr) {
                                return lyr.Name == wizScope.query.layerData.currentLayer.Name;
                            });
                            if (!_.isUndefined(gsLayer)) {
                                gsLayer.derivedLayers.push(derivedLayer);
                                catScope.toggleLayer(gsLayer, derivedLayer);
                            }
                        });
                    }
                }
            })
        );

        var wiz = new Wizard('Make Histogram', 'fa-bar-chart', 'fa-check text-success', steps, wizScope);
        wizardManager.launchWizard(wiz);
    };

}])

.directive('stHistogramWizSource',
function () {
    return {
        restrict: 'E',
        templateUrl: 'histogram/wizard/templates/source.tpl.html'
    };
})

.directive('stHistogramWizSpatialBounds',
function () {
    return {
        restrict: 'E',
        templateUrl: 'histogram/wizard/templates/spatialbounds.tpl.html'
    };
})

.directive('stHistogramWizTimeBounds',
function () {
    return {
        restrict: 'E',
        templateUrl: 'histogram/wizard/templates/timebounds.tpl.html'
    };
})

.directive('stHistogramWizOptions',
function () {
    return {
        restrict: 'E',
        templateUrl: 'histogram/wizard/templates/options.tpl.html'
    };
})

;