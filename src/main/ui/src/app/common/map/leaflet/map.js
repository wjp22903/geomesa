angular.module('stealth.common.map.leaflet.map', [
    'stealth.common.map.leaflet.canvas',
    'stealth.common.control.playbackControl',
    'stealth.common.control.leaflet.layersLegendControl'
])

.directive('leafletLiveMap',
    ['$rootScope', '$interval', 'CONFIG',
     'CanvasFactory', 'CanvasDrawingService',
    function ($rootScope, $interval, CONFIG, CanvasFactory, CanvasDrawingService) {
        return {
            restrict: 'E',
            replace: true,
            template: '<div class="leaflet-map"></div>',
            link: function (scope, element, attrs) {

                // Configuration:
                var initLon = CONFIG.map.lon || 0;
                var initLat = CONFIG.map.lat || 0;
                var initMapCenter = L.latLng(initLat, initLon);
                var initMapZoom = CONFIG.map.zoom || 8;
                var mapMinZoom = CONFIG.map.minZoom || 1;
                var mapMaxZoom = CONFIG.map.maxZoom || 10;

                var map = L.map(attrs.id, {
                    center: initMapCenter,
                    zoom: initMapZoom,
                    minZoom: mapMinZoom,
                    maxZoom: mapMaxZoom,
                    crs: L.CRS.EPSG4326
                });

                var base = L.tileLayer.wms(CONFIG.map.baseLayers[0].url, {
                    transparent: true,
                    layers: CONFIG.map.baseLayers[0].getMapParams.layers,
                    format: CONFIG.map.baseLayers[0].getMapParams.format || 'image/png',
                    crs: L.CRS.EPSG4326
                });

                var numFunction = 0;
                var draw = CanvasDrawingService.getDrawFunction(numFunction);
                CanvasFactory.createCanvas(draw).addTo(map);

                function mapStateChanged() {
                    CanvasDrawingService
                        .setMapState({
                            mapZoom: map.getZoom(),
                            mapWidth: map.getSize().x,
                            mapHeight: map.getSize().y,
                            mapBounds: map.getBounds()
                        });
                }
                map.on('viewreset resize moveend', function (e) { mapStateChanged(); });

                /*
                 * https://github.com/Leaflet/Leaflet/issues/941
                 * workaround to deal with Angular<->Leaflet issue
                 * Wait until element is displayed, then invalidate map size
                 * and load baselayer.
                 */
                var checkDisplay = $interval(function () {
                    var display = element.css('display');
                    if (display !== 'none') {
                        $interval.cancel(checkDisplay); //cancel further checks
                        map.invalidateSize();
                        base.addTo(map);
                        mapStateChanged();
                    }
                }, 100);


            } // END of link function.
        };
    }
])

.directive('leafletPlaybackMap',
    ['$rootScope', '$interval', 'CONFIG',
     'CanvasFactory', 'CanvasDrawingService',
     'PlaybackControlFactory', 'LayersLegendControlFactory',
    function ($rootScope, $interval, CONFIG,
              CanvasFactory, CanvasDrawingService,
              PlaybackControlFactory, LayersLegendControlFactory) {
        return {
            restrict: 'E',
            replace: true,
            template: '<div class="leaflet-map"></div>',
            link: function (scope, element, attrs) {

                // Configuration:
                var initLon = CONFIG.map.lon || 0;
                var initLat = CONFIG.map.lat || 0;
                var initMapCenter = L.latLng(initLat, initLon);
                var initMapZoom = CONFIG.map.zoom || 8;
                var mapMinZoom = CONFIG.map.minZoom || 1;
                var mapMaxZoom = CONFIG.map.maxZoom || 10;

                var map = L.map(attrs.id, {
                    center: initMapCenter,
                    zoom: initMapZoom,
                    minZoom: mapMinZoom,
                    maxZoom: mapMaxZoom,
                    crs: L.CRS.EPSG4326
                });

                var base = L.geoJson(countries, {
                        style: {
                            'color': "#000047",
                            'opacity': 0.1,
                            'weight': 1
                        }
                    });


                var playbackCtrl = PlaybackControlFactory.createControl().addTo(map);
                var layersCtrl = LayersLegendControlFactory.createControl().addTo(map);

                var numFunction = 0;
                var draw = CanvasDrawingService.getDrawFunction(numFunction);
                CanvasFactory.createCanvas(draw).addTo(map);

                function mapStateChanged() {
                    CanvasDrawingService
                        .setMapState({
                            mapZoom: map.getZoom(),
                            mapWidth: map.getSize().x,
                            mapHeight: map.getSize().y,
                            mapBounds: map.getBounds()
                        });
                }
                map.on('viewreset resize moveend', function (e) { mapStateChanged(); });

                /*
                 * https://github.com/Leaflet/Leaflet/issues/941
                 * workaround to deal with Angular<->Leaflet issue
                 * Wait until element is displayed, then invalidate map size
                 * and load baselayer.
                 */
                var checkDisplay = $interval(function () {
                    var display = element.css('display');
                    if (display !== 'none') {
                        $interval.cancel(checkDisplay); //cancel further checks
                        map.invalidateSize();
                        base.addTo(map);
                        mapStateChanged();
                    }
                }, 100);
                $rootScope.$on('get leaflet map bounds', function(event, callback) {
                    var b = map.getBounds();
                    var bounds = {
                        west: b.getWest(),
                        south: b.getSouth(),
                        east: b.getEast(),
                        north: b.getNorth()
                    };
                    callback(bounds);
                });
            } // END of link function.

        };
    }
])
;
