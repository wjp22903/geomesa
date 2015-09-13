angular.module('stealth.p2p.geo', [
    'stealth.p2p.wizard'
])

.run([
'$log',
'$rootScope',
'colors',
'ol3Map',
'categoryManager',
'p2pWizard',
'p2pService',
'stealth.core.geo.ol3.manager.Category',
'stealth.core.utils.WidgetDef',
'stealth.core.geo.ol3.layers.GeoJsonVectorLayer',
function ($log, $rootScope, colors,
          ol3Map, catMgr, p2pWizard, p2pService,
          Category, WidgetDef, GeoJsonVectorLayer) {
    var tag = 'stealth.p2p.geo: ';
    $log.debug(tag + 'run called');
    var scope = $rootScope.$new();
    scope.layers = [];
    scope.workspaces = {};

    scope.removeLayer = function (layer) {
        if (layer.viewState.isOnMap) {
            scope.toggleVisibility(layer);
        }
        _.pull(scope.layers, layer);
        _.pull(scope.threatSurfaces, layer);
    };

    scope.toggleVisibility = function (layer) {
        var mapLayer = ol3Map.getLayerById(layer.mapLayerId);
        var ol3Layer = mapLayer.getOl3Layer();
        ol3Layer.setVisible(!ol3Layer.getVisible());
        layer.viewState.toggledOn = !layer.viewState.toggledOn;
    };

    scope.launchP2pWizard = function () {
        scope.isWizardInProgress = true;
        p2pWizard.launch();
    };

    scope.runP2pQuery = function (q) {
        p2pService.doP2PQuery(q).then(
            function (response) {
                var geojsonParser = new ol.format.GeoJSON();
                var geojson = geojsonParser.readFeatures(response, "features");
                var queryTitle = q.params.title;

                var colorMap = {};
                var getColorForGrouping = function (attr) {
                    if (!(attr in colorMap)) {
                        colorMap[attr] = colors.getColor();
                    }
                    return colorMap[attr];
                };

                var styleFunction = function (feature) {// for the future: , resolution) {
                    var geometry = feature.getGeometry();
                    var groupColor = getColorForGrouping(feature.get(q.params.groupingField.name));
                    var styles = [
                        // LineString style
                        new ol.style.Style({
                            stroke: new ol.style.Stroke({
                                color: groupColor,
                                width: q.params.lineWidth
                            })
                        })
                    ];

                    // Compute rotation of the arrow
                    var coords = geometry.getCoordinates();
                    var start = coords[0];
                    var end = coords[1];
                    var dx = end[0] - start[0];
                    var dy = end[1] - start[1];
                    var rot = Math.PI/2 - Math.atan2(dy, dx);

                    // Compute the midpoint for placement
                    var startPt = new OpenLayers.Geometry.Point(start[0], start[1]);
                    var endPt = new OpenLayers.Geometry.Point(end[0], end[1]);
                    var ls = new OpenLayers.Geometry.LineString([startPt, endPt]);
                    var centroid = ls.getCentroid(true);

                    // Arrow Style
                    styles.push(new ol.style.Style({
                        geometry: new ol.geom.Point([centroid.x, centroid.y]),
                        image: new ol.style.RegularShape({
                            fill: new ol.style.Fill({color: groupColor}),
                            stroke: new ol.style.Stroke({color: groupColor, width: 2}),
                            points: 3,
                            radius: q.params.arrowSize,
                            rotation: rot,
                            angle: 0
                        })
                    }));

                    return styles;
                };

                var lyr = new GeoJsonVectorLayer({
                    queryable: true,
                    queryFn: function () {
                        lyr.loadStart();
                        lyr.loadFeatures(geojson);
                        lyr.loadEnd();
                    },
                    styleFn: styleFunction,
                    layerThisBelongsTo: q.layerData.currentLayer
                });
                ol3Map.addLayer(lyr);

                lyr.viewState = {
                    isOnMap: true,
                    toggledOn: true,
                    isLoading: false,
                    lastOpacity: 1
                };
                lyr.OriginalTitle = queryTitle;
                lyr.Title = queryTitle;
                lyr.mapLayerId = lyr.id;
                scope.layers.push(lyr);
            });
    };

    p2pWizard.setCategoryScope(scope);
    var widgetDef = new WidgetDef('st-p2p-geo-category', scope);
    var category = new Category(2, 'P2P', 'fa-line-chart', widgetDef, null, true);
    catMgr.addCategory(1, category);
}])

.directive('stP2pGeoCategory', [
'$log',
function ($log) {
    var tag = 'stealth.p2p.geo.stP2PGeoCategory: ';
    $log.debug(tag + 'directive defined');
    return {
        templateUrl: 'p2p/geo/category.tpl.html'
    };
}])

;
