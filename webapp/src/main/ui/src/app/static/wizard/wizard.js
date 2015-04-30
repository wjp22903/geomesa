angular.module('stealth.static.wizard')

.service('staticLayerWizard', [
'$log',
'$rootScope',
'$filter',
'wizardManager',
'ol3Map',
'ol3Styles',
'colors',
'cqlHelper',
'stealth.core.wizard.Step',
'stealth.core.wizard.Wizard',
'stealth.static.wizard.Query',
'stealth.core.utils.WidgetDef',
'CONFIG',
function ($log, $rootScope, $filter,
          wizardManager, ol3Map, ol3Styles, colors, cqlHelper,
          Step, Wizard, Query, WidgetDef, CONFIG) {
    var tag = 'stealth.static.wizard.staticLayerWizard: ';
    $log.debug(tag + 'service started');

    var dragBox = new ol.interaction.DragBox({
        style: ol3Styles.getPolyStyle(1, '#CC0099')
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

    var markerShapes = ['circle', 'square', 'triangle', 'star', 'cross', 'x'];
    var counter = 0;
    function getShape () {
        var shape = markerShapes[counter++ % 6];
        if (counter % 6 === 0) {
            counter = 0;
        }
        return shape;
    }

    this.launch = function (layer, toggleLayer, overrides) {
        var wizScope = $rootScope.$new();
        var steps = [];

        wizScope.layer = layer;
        wizScope.query = new Query();
        wizScope.query.getFeatureTypeDescription(wizScope.layer);

        _.merge(wizScope.query.params, overrides);

        var useMask = true;
        steps.push(new Step('Identify important fields',
            new WidgetDef('st-static-wiz-source', wizScope),
            null,
            useMask)
        );

        steps.push(new Step('Define search area',
            new WidgetDef('st-static-wiz-spatial-bounds', wizScope),
            null,
            !useMask,
            // Setup function
            function (stepNum) {
                if (!wizScope.boundWiz) {
                    wizScope.boundWiz = {
                        drawing: false,
                        setWholeEarth: function () {
                            wizScope.query.params.minLon = -180;
                            wizScope.query.params.minLat = -90;
                            wizScope.query.params.maxLon = 180;
                            wizScope.query.params.maxLat = 90;
                        },
                        setMapExtent: function () {
                            var bounds = parseBounds(ol3Map.getExtent());
                            wizScope.query.params.minLon = bounds[0];
                            wizScope.query.params.minLat = bounds[1];
                            wizScope.query.params.maxLon = bounds[2];
                            wizScope.query.params.maxLat = bounds[3];
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
            })
        );

        steps.push(new Step('Define time range',
            new WidgetDef('st-static-wiz-time-bounds', wizScope),
            null,
            useMask)
        );

        angular.extend(wizScope, {
            style: {
                'background-color': colors.getColor()
            },
            markerStyles: ['point', 'heatmap'],
            sld: {
                'point': 'stealth_dataPoints',
                'heatmap': 'stealth_heatmap'
            },
            markerShapes: markerShapes
        });
        wizScope.query.params.markerShape = getShape();
        wizScope.query.params.fillColor = wizScope.style['background-color'];
        wizScope.getIconImgSrc = function (layer) {
            var url = wizScope.layer.wmsUrl || CONFIG.geoserver.defaultUrl + '/wms';
            var iconImgSrc = url +
                             "?REQUEST=GetLegendGraphic&FORMAT=image/png&WIDTH=24&HEIGHT=24&TRANSPARENT=true&LAYER=" +
                             wizScope.layer.Name +
                             "&ENV=" + 'color:' + wizScope.query.params.fillColor.slice(1) +
                                       ';size:' + wizScope.query.params.size +
                                       ';shape:' + wizScope.query.params.markerShape +
                                       ';radiusPixels:' + wizScope.query.params.radiusPixels +
                             "&STYLE=" + wizScope.sld[wizScope.query.params.markerStyle];
            return iconImgSrc;
        };

        steps.push(new Step('Set options',
            new WidgetDef('st-static-wiz-options', wizScope),
            null,
            useMask,
            _.noop(),
            // Teardown function submits query.
            function (stepNum, success) {
                if (success) {
                    var cql = cqlHelper.buildSpaceTimeFilter(wizScope.query.params);
                    var filterLayer = {
                        title: wizScope.query.params.title,
                        layerName: layer.Name,
                        layerTitle: layer.Title,
                        serverUrl: layer.serverUrl,
                        queryable: layer.queryable,
                        viewState: {
                            isOnMap: false,
                            toggledOn: false,
                            isLoading: false,
                            isRemovable: true,
                            markerStyle: wizScope.query.params.markerStyle,
                            markerShape: wizScope.query.params.markerShape,
                            size: wizScope.query.params.size,
                            fillColor: wizScope.style['background-color'],
                            radiusPixels: wizScope.query.params.radiusPixels
                        },
                        cqlFilter: _.isEmpty(cql) ? null : cql,
                        style: 'stealth_dataPoints',
                        env: wizScope.style['background-color'] ? 'color:' + wizScope.style['background-color'].substring(1) : null
                    };
                    layer.filterLayers.push(filterLayer);
                    toggleLayer(layer, filterLayer);
                }
            })
        );

        var wiz = new Wizard('Query Data Layer', 'fa-database', 'fa-check text-success', steps, wizScope);
        wizardManager.launchWizard(wiz);
    };
}])

.directive('stStaticWizSource',
function () {
    return {
        restrict: 'E',
        templateUrl: 'static/wizard/templates/source.tpl.html'
    };
})

.directive('stStaticWizSpatialBounds',
function () {
    return {
        restrict: 'E',
        templateUrl: 'static/wizard/templates/spatialbounds.tpl.html'
    };
})

.directive('stStaticWizTimeBounds',
function () {
    return {
        restrict: 'E',
        templateUrl: 'static/wizard/templates/timebounds.tpl.html'
    };
})

.directive('stStaticWizOptions',
function () {
    return {
        restrict: 'E',
        templateUrl: 'static/wizard/templates/options.tpl.html'
    };
})

;