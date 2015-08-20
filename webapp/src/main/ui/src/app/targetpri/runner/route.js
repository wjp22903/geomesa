angular.module('stealth.targetpri.runner', [
    'stealth.core.geo.ol3.format',
    'stealth.targetpri.results'
])

.run([
'$rootScope',
'routeRankRunner',
function ($rootScope, routeRankRunner) {
    $rootScope.$on('targetpri:request:route', function (evt, req) { //eslint-disable-line no-unused-vars
        routeRankRunner.run(req);
    });
}])

.service('routeRankRunner', [
'$rootScope',
'sidebarManager',
'stealth.core.utils.WidgetDef',
'proximityService',
'rankService',
'ol3Styles',
'stealth.core.geo.ol3.format.GeoJson',
'stealth.core.geo.ol3.layers.MapLayer',
'stealth.targetpri.geo.ol3.layers.TargetPriResultLayer',
'stealth.targetpri.results.Category',
'categoryManager',
'colors',
'cqlHelper',
function ($rootScope, sidebarManager, WidgetDef, proximityService,
          rankService, ol3Styles, GeoJson, MapLayer, TargetPriResultLayer, Category, catMgr, colors, cqlHelper) {
    var geoJsonFormat = new GeoJson(); // stealth GeoJson, extending OL3 for STEALTH-319
    this.run = function (req) {
        var category = catMgr.addCategory(2, new Category(req.name, function () {
            sidebarManager.removeButton(buttonId);
            scope.$destroy();
        }));

        var routeName = 'Route for [' + req.name + ']';
        category.addLayer(new MapLayer(routeName, new ol.layer.Vector({
            source: new ol.source.Vector({
                features: [req.routeFeature]
            }),
            style: ol3Styles.getLineStyle(3, '#CC0099')
        }), false));

        var geoJson = geoJsonFormat.writeFeatures([req.routeFeature]);
        var promise = rankService.doGeoJsonRouteRank(_.map(req.dataSources, function (dataSource) {
            var filter = cqlHelper.buildDtgFilter(dataSource.fieldNames.dtg, req.startDtg, req.endDtg);
            var promise = proximityService.doGeoJsonProximity({
                inputGeoJson: geoJson,
                dataLayer: dataSource.Name,
                dataLayerFilter: filter,
                bufferMeters: req.proximityMeters
            }).then(function (layerName) {
                dataSource.proximityLayer = category.addLayer(
                    new TargetPriResultLayer({
                        name: dataSource.Title + ' for [' + req.name + ']',
                        requestParams: {
                            LAYERS: layerName,
                            STYLES: 'stealth_dataPoints',
                            ENV: 'color:BEBE40;opacity:0.6;size:10'
                        },
                        queryable: true
                    }, req, dataSource)
                );
                return layerName;
            });
            return {
                dataSource: dataSource,
                filter: filter,
                proximityPromise: promise
            };
        }), {
            inputGeoJson: geoJson,
            bufferMeters: req.proximityMeters
        }).then(function (response) {
            var templateFn = stealth.jst['sld/point_colorBy.xml'];
            var top = {};
            var howMany = 10;
            _.each(_.take(response.combined.results, howMany), function (rank, index) {
                rank.color = colors.getColor(index);
                if (top[rank.dataSource.Name]) {
                    top[rank.dataSource.Name].push(rank);
                } else {
                    top[rank.dataSource.Name] = [rank];
                }
            });
            _.each(response.dataSources, function (dataSource) {
                dataSource.proximityLayer.updateRequestParams({
                    STYLES: null,
                    ENV: null,
                    SLD_BODY: templateFn({
                        layerName: dataSource.proximityLayerName,
                        attribute: dataSource.fieldNames.id,
                        valueMap: _.map(top[dataSource.Name], function (rank) {
                            return '<ogc:Literal>' + rank.key + '</ogc:Literal>' +
                                '<ogc:Literal>' + rank.color + '</ogc:Literal>';
                        }).join('')
                    }).replace(/(\r\n|\n|\r)\s*/gm, ' ')
                });
            });
            return response.combined;
        });

        var scope = $rootScope.$new();
        scope.promise = promise;
        scope.request = req;

        //Need some scope placeholders to link the results with the pager
        scope.response = null;
        scope.paging = null;

        var buttonId = sidebarManager.toggleButton(
            sidebarManager.addButton(req.name, 'fa-crosshairs', 500,
                new WidgetDef('st-target-pri-results', scope),
                new WidgetDef('st-pager', scope, "paging='paging' records='response.results'"), false, function () {
                    catMgr.removeCategory(category.id);
                    scope.$destroy();
                }),
            true);
    };
}])
;
