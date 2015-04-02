angular.module('stealth.targetpri.runner', [
    'stealth.targetpri.results'
])

.run([
'$rootScope',
'routeRankRunner',
function ($rootScope, routeRankRunner) {
    $rootScope.$on('targetpri:request:route', function (evt, req) {
        routeRankRunner.run(req);
    });
}])

.service('routeRankRunner', [
'$rootScope',
'$q',
'sidebarManager',
'stealth.core.utils.WidgetDef',
'proximityService',
'rankService',
'ol3Map',
'ol3Styles',
'stealth.core.geo.ol3.layers.WmsLayer',
'stealth.core.geo.ol3.layers.GeoJsonLayer',
'stealth.targetpri.results.Category',
'categoryManager',
'colors',
'cqlHelper',
function ($rootScope, $q, sidebarManager, WidgetDef, proximityService,
          rankService, ol3Map, ol3Styles, WmsLayer, GeoJsonLayer, Category, catMgr, colors, cqlHelper) {
    var geoJsonFormat = new ol.format.GeoJSON();
    this.run = function (req) {
        var category = catMgr.addCategory(2, new Category(req.name, function () {
            sidebarManager.removeButton(buttonId);
            scope.$destroy();
        }));

        var routeName = 'Route for [' + req.name + ']';
        category.addLayer(new GeoJsonLayer(routeName, new ol.layer.Vector({
            source: new ol.source.Vector({
                features: [req.routeFeature]
            }),
            style: ol3Styles.getLineStyle(3, '#CC0099')
        })));

        var geoJson = geoJsonFormat.writeFeatures([req.routeFeature]);
        var promise = rankService.doGeoJsonRouteRank(_.map(req.dataSources, function (dataSource) {
            var filter = cqlHelper.buildDtgFilter(dataSource.fieldNames.dtg, req.startDtg, req.endDtg);
            var promise = proximityService.doGeoJsonProximity({
                inputGeoJson: geoJson,
                dataLayer: dataSource.Name,
                dataLayerFilter: filter,
                bufferMeters: req.proximityMeters
            }).then(function (layerName) {
                dataSource.proximityLayer = category.addLayer(new WmsLayer(dataSource.Title + ' for [' + req.name + ']', {
                    LAYERS: layerName,
                    STYLES: 'stealth_dataPoints',
                    ENV: 'color:BEBE40;opacity:0.6;size:10'
                }), true);
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
