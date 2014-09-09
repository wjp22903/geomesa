angular.module('stealth.common.map.leaflet.leafletMap', [
    'stealth.common.map.leaflet.utils',
    'stealth.common.control.airTrackerLayersControl',
    'stealth.common.control.airTrackInfoControl'
])

.directive('leafletMap',
    ['$interval', '$rootScope', 'CONFIG',
     'LeafletFeatures', 'AirTrackerLayers', 'AirTrackInfo',
    function ($interval, $rootScope, CONFIG,
              LeafletFeatures, AirTrackerLayers, AirTrackInfo) {

        return {
            restrict: 'E',
            replace: true,
            template: '<div class="leaflet-map"></div>',
            link: function (scope, element, attrs) {

                // Configuration:
                var initLon = CONFIG.map.lon || 30;
                var initLat = CONFIG.map.lat || 90;
                var initMapCenter = L.latLng(initLon, initLat);
                var initMapZoom = CONFIG.map.zoom || 10;
                var mapMaxZoom = CONFIG.map.maxZoom || 18;

                var map = L.map(attrs.id, {
                    center: initMapCenter,
                    zoom: initMapZoom,
                    maxZoom: mapMaxZoom,
                    crs: L.CRS.EPSG4326
                });

                var base = L.tileLayer.wms(CONFIG.map.url, {
                    layers: CONFIG.map.baseLayers,
                    format: CONFIG.map.format
                });

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
                    }
                }, 100);

                var trackers = {};
                var trackerGroup = {};
                var overlayGroups = {};
                var overlayStyles = {};
                var colors = {};
                var labels = {};
                var numSegments = {};

                var styles = CONFIG.trackStyles;
                _.each(styles, function(s) {
                    var label = s.labelName;

                    overlayGroups[label] = L.layerGroup();
                    map.addLayer(overlayGroups[label]);

                    var curStyle = new LeafletFeatures.LayerStyle(s);
                    overlayStyles[label] = curStyle;

                    colors[label] = curStyle.color;

                    var contributor = s.contributor;
                    labels[contributor] = label;

                    numSegments[label] = s.numSegments;
                });

                var layerCtrl =
                    AirTrackerLayers.createControl(null,
                                                   overlayGroups,
                                                   colors,
                                                  {position: 'bottomleft',
                                                   collapsed: false});
                layerCtrl.addTo(map);

                var infoCtrl = AirTrackInfo.createControl().addTo(map);

                function getLabel(feature) {
                    var lbl = "";
                    if (feature.properties.isInteresting === true) {
                        lbl = "Interesting";
                    } else if (feature.properties.isMultisource === true) {
                        lbl = "Multi-source";
                    } else {
                        lbl = labels[feature.properties.contributor];
                    }

                    return lbl;
                }

                function pruneLineString(feature, maxSegments) {
                    var len = feature.geometry.coordinates.length;
                    feature.geometry.coordinates.length = (len < 3) ? 0 : Math.min(len, maxSegments + 1);
                    return feature;
                }

                function segmentLineString(feature) {
                    var points = feature.geometry.coordinates;
                    var segments = [];
                    var len = points.length;
                    for (var pnt=1; pnt<len; ++pnt) {
                        var segment = {
                            "type": "Feature",
                            "properties": feature.properties,
                            "geometry": {
                                "type": "LineString",
                                "coordinates": [points[pnt-1], points[pnt]]
                            }
                        };
                        segments.push(segment);
                    }
                    return segments;
                }

                function buildLayers(segmented, style) {
                    var nSegs = segmented.length;
                    if (nSegs < 1) {
                        return [];
                    }

                    // Style the segments
                    var seg0 = segmented[0];
                    var gJ = L.geoJson(seg0, {
                        style: style
                    });
                    gJ.on('click', LeafletFeatures.onClick);
                    var popupText = "hexid: " + seg0.properties.hexid;
                    gJ.bindPopup(popupText);

                    for (var seg=1; seg<nSegs; ++seg) {
                        var pnt0 = segmented[seg].geometry.coordinates[0];
                        var pnt1 = segmented[seg].geometry.coordinates[1];
                        var factor = (nSegs - seg) / nSegs;
                        var lineI = L.polyline([[pnt0[1], pnt0[0]], [pnt1[1], pnt1[0]]], {
                            color: style.color,
                            fillColor: style.fillColor,
                            weight: style.weight * factor,
                            opacity: style.opacity
                        });

                        gJ.addLayer(lineI);
                    }

                    return [gJ];
                }

                // Action when a track is clicked on:
                $rootScope.$on('clicked on feature',
                    function (evt, msg) {
                        var feature = msg.feature;
                        var style = msg.style;
                        infoCtrl.update(feature, style);
                    }
                );

                // Action for each new track received:
                scope.$on('new track', function (evt, msg) {
                    if(msg.remove) {
                        var removeId = msg.remove;
                        if(trackers[removeId]) {
                            var lyrGrp = trackerGroup[removeId];
                            _.each(trackers[removeId], function (lyr) {
                                lyrGrp.removeLayer(lyr);
                            });
                            trackers[removeId] = [];
                        }
                    } else {
                        // First, clear out any tracks related to the incoming one.
                        var id = msg.properties.hexid;
                        if (trackers[id]) {
                            var lyrGrpToClear = trackerGroup[id];
                            _.each(trackers[id], function (lyr) {
                                lyrGrpToClear.removeLayer(lyr);
                            });
                        }

                        var lbl = getLabel(msg);
                        var pruned = pruneLineString(msg, numSegments[lbl]);
                        var segmented = segmentLineString(pruned);
                        var layers = buildLayers(segmented, overlayStyles[lbl]);

                        trackers[id] = [];
                        trackerGroup[id] = overlayGroups[lbl];
                        _.each(layers, function (lyr) {
                            trackerGroup[id].addLayer(lyr);
                            trackers[id].unshift(lyr);
                        });
                    }
                }, true);

                // Action for each new track history received:
                $rootScope.$on('new track history',
                    function (evt, collection, style) {
                        var group = L.layerGroup();
                        style.opacity = 0.5;
                        style.weight = 2;
                        _.each(collection.features, function (feature) {
                            var layer = L.geoJson(feature, {
                                style: style,
                                onEachFeature: LeafletFeatures.onCreation
                            });
                            var popupText = "hexid: " + feature.properties.hexid;
                            layer.bindPopup(popupText);
                            group.addLayer(layer);
                        });
                        layerCtrl.addOverlay(group,
                            collection.features[0].properties.hexid,
                            style.color);
                        map.addLayer(group);
                    }
                );
            }
        };
    }]
)
;

