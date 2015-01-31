angular.module('stealth.static.wizard')

.service('staticDataWiz', [
'$log',
'$rootScope',
'ol3Map',
'wizardManager',
'colors',
'wfs',
'stealth.core.wizard.Wizard',
'stealth.core.wizard.Step',
'stealth.core.utils.WidgetDef',
'CONFIG',
function ($log, $rootScope,
          ol3Map, wizardManager, colors, wfs,
          Wizard, Step, WidgetDef, CONFIG) {

    var markerShapes = ['circle', 'square', 'triangle', 'star', 'cross', 'x'];
    var counter = 0;
    function getShape () {
        var shape = markerShapes[counter++ % 6];
        if (counter % 6 === 0) {
            counter = 0;
        }
        return shape;
    }

    this.launch = function (layer, toggleLayer) {
        var wizardScope = $rootScope.$new();
        wizardScope.layer = layer;
        wizardScope.featureTypeData = "pending";
        var ftdPromise =
            wfs.getFeatureTypeDescription(CONFIG.geoserver.defaultUrl, layer.Name, CONFIG.geoserver.omitProxy)
            .then(function (data) {
                if (data.error) {
                    return 'unavailable';
                }
                return data;
            });

        angular.extend(wizardScope, {
            style: {
                'background-color': colors.getColor()
            }
        });

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
            type: 'Polygon'
        });
        draw.on('drawstart', function () {featureOverlay.getFeatures().clear();});
        draw.on('drawend', function (evt) {
            wizardScope.$apply(function () {
                wizardScope.geoFeature = evt.feature;
            });
        });

        wizardManager.launchWizard(
            new Wizard('Add Data to Map', 'fa-database', 'fa-check text-success', [
                //TODO - create directive for this step
                new Step('Define search area', new WidgetDef('st-placeholder', wizardScope), null, false,
                    function (stepNum) {
                        ol3Map.addOverlay(featureOverlay);
                        ol3Map.addInteraction(modify);
                        ol3Map.addInteraction(draw);
                    },
                    function (stepNum, success) {
                        ol3Map.removeInteraction(draw);
                        ol3Map.removeInteraction(modify);
                        ol3Map.removeOverlay(featureOverlay);
                    }
                ),
                new Step('Set options', new WidgetDef('st-static-options-wiz', wizardScope), null, true,
                    function (stepNum) {
                        ftdPromise.then(function (data) {
                            wizardScope.featureTypeData = data;
                        });
                    },
                    function (stepNum, success) {
                        if (success) {
                            var cql = wizardScope.geoFeature ? 'INTERSECTS(geom, ' +
                                (new ol.format.WKT()).writeFeature(wizardScope.geoFeature) +
                                ')' : null;
                            cql = _.compact([wizardScope.cqlFilter, cql]).join(' AND ');

                            var filterLayer = {
                                title: wizardScope.title,
                                layerName: layer.Name,
                                layerTitle: layer.Title,
                                wmsUrl: layer.wmsUrl,
                                queryable: layer.queryable,
                                viewState: {
                                    isOnMap: false,
                                    toggledOn: false,
                                    isLoading: false,
                                    isRemovable: true,
                                    markerStyle: 'point',
                                    markerShape: getShape(),
                                    size: 9,
                                    fillColor: wizardScope.style['background-color']
                                },
                                cqlFilter: _.isEmpty(cql) ? null : cql,
                                style: 'stealth_dataPoints',
                                env: wizardScope.style['background-color'] ? 'color:' + wizardScope.style['background-color'].substring(1) : null
                            };

                            layer.filterLayers.push(filterLayer);

                            toggleLayer(layer, filterLayer);
                        }
                    }
                )
            ])
        );
    };
}])

.directive('stStaticOptionsWiz', [
function () {
    return {
        restrict: 'E',
        templateUrl: 'static/wizard/templates/options.tpl.html'
    };
}])
;
