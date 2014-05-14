angular.module('stealth.common.map.leafletMap', [
    'ngResource'
])
    .factory('MapConfig', ['$resource', function ($resource) {
        return $resource('mapservice/basemapconf', {}, {
            query: {method: 'GET', params: {}, isArray: false}
        });
    }])

    .service('MapService', [function () {
        this.addLayer = function (scope, lc) {
            var layer = new L.TileLayer.WMS(lc.url, {
                layers: lc.layers,
                format: 'image/png',
                transparent: true,
                crs: L.CRS.EPSG4326,
                cql_filter: lc.cql_filter ? lc.cql_filter : '1=1'
            });

            scope.map.addLayer(layer, false);
            scope.layerControl.addOverlay(layer, 'Sites');
        };
    }])

    .directive('leafletMap', ['MapConfig', 'MapService', function (MapConfig, MapService) {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                mc: '=',
                map: '='
            },
            template: '<div class="leaflet-map"></div>',
            link: function (scope, element, attrs) {
                var baseLayer;

                MapConfig.query().$promise.then(function (mc) {
                    scope.mc = mc;
                    scope.map = L.map(attrs.id, {
                        center: [mc.centerLat, mc.centerLon],
                        zoom: mc.defaultZoom,
                        maxZoom: mc.maxZoom,
                        minZoom: mc.minZoom,
                        zoomControl: false

                    });
                    baseLayer = new L.TileLayer.WMS(mc.url, {
                        layers: mc.baseLayers,
                        format: mc.format,
                        attribution: mc.attribution,
                        transparent: mc.transparent,
                        crs: mc.crs === "EPSG:4326" ? L.CRS.EPSG4326 : L.CRS.EPSG3857
                    });

                    L.control.zoom({position: 'topleft'}).addTo(scope.map);
                    scope.layerControl = L.control.layers({'Base': baseLayer}, {}, {position: 'topleft'});
                    scope.layerControl.addTo(scope.map);

                    scope.map.addLayer(baseLayer, true);
                });

                scope.$on("AddMapLayer", function (event, lc) {
                    MapService.addLayer(scope, lc);
                });
                scope.$on("CenterPaneFullWidthChange", function (event, fullWidth) {
                    scope.map.invalidateSize();
                });
            }
        };

    }]);

