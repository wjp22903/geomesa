angular.module('stealth.static.wizard')

.service('staticDataWiz', [
'$rootScope',
'ol3Map',
'stealth.core.geo.ol3.layers.MapLayer',
'wizardManager',
'stealth.core.wizard.Wizard',
'stealth.core.wizard.Step',
'stealth.core.utils.WidgetDef',
'CONFIG',
function ($rootScope, ol3Map, MapLayer, wizardManager, Wizard, Step, WidgetDef, CONFIG) {
    this.launch = function (layer) {
        var wizardScope = $rootScope.$new();
        angular.extend(wizardScope, {
            style: {
                'background-color': '#0099CC'
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
                    null, function (stepNum, success) {
                        if (success) {
                            var cql = wizardScope.geoFeature ? 'INTERSECTS(geom, ' +
                                (new ol.format.WKT()).writeFeature(wizardScope.geoFeature) +
                                ')' : null;
                            cql = _.compact([wizardScope.cqlFilter, cql]).join(' AND ');
                            var filterLayer = {
                                name: wizardScope.name,
                                toggledOn: true,
                                removeable: true,
                                cqlFilter: _.isEmpty(cql) ? null : cql,
                                style: 'stealth_dataPoints',
                                env: wizardScope.style['background-color'] ? 'color:' + wizardScope.style['background-color'].substring(1) : null
                            };
                            layer.filterLayers.push(filterLayer);
                            var mapLayer = new MapLayer(layer.Title + ' - ' + filterLayer.name, new ol.layer.Tile({
                                source: new ol.source.TileWMS({
                                    url: CONFIG.geoserver.defaultUrl + '/wms',
                                    params: {
                                        LAYERS: layer.Name,
                                        CQL_FILTER: filterLayer.cqlFilter,
                                        STYLES: filterLayer.style,
                                        ENV: filterLayer.env,
                                        BUFFER: 6
                                    }
                                })
                            }));
                            filterLayer.mapLayerId = mapLayer.id;
                            ol3Map.addLayer(mapLayer);
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
