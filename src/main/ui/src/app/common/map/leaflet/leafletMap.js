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
                var isGoodLineString = {};
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

                    overlayStyles[label] = new LeafletFeatures.LayerStyle(s);

                    colors[label] = overlayStyles[label].color;

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

                function addGeoJsonLayerToGroup(feature) {
                    var lbl = "";
                    if (feature.properties.isMultisource === true) {
                        lbl = "Multi-source";
                    } else if (feature.properties.isInteresting === true) {
                        lbl = "Interesting";
                    } else {
                        lbl = labels[feature.properties.contributor];
                    }
                    var grp = overlayGroups[lbl];

                    var pruned = pruneLineString(feature, numSegments[lbl]);
                    var segmented = segmentLineString(pruned);
                    var layers = [];

                    // Style the segments
                    var nSegs = segmented.length;
                    for (var seg=0; seg<nSegs; ++seg) {
                        var style = angular.copy(overlayStyles[lbl]);

                        var factor = (nSegs - seg) / nSegs;
                        style.weight = overlayStyles[lbl].weight * factor;

                        var segI = L.geoJson(segmented[seg], {
                            style: style,
                            onEachFeature: LeafletFeatures.onCreation
                        });
                        var popupText = "hexid: " + segmented[seg].properties.hexid;
                        segI.bindPopup(popupText);
                        grp.addLayer(segI);
                        layers.push(segI);
                    }

                    return {
                        group: grp,
                        layers: layers
                    };
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
                        var segment = angular.copy(feature);
                        segment.geometry.coordinates = [
                            points[pnt-1],
                            points[pnt]
                        ];
                        segments.push(segment);
                    }
                    return segments;
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
                        var obj = addGeoJsonLayerToGroup(msg);
                        var group = obj.group;
                        var layers = obj.layers;
                        var id = msg.properties.trackId;

                        if (!trackers[id]) {
                            trackers[id] = [];
                            trackerGroup[id] = group;
                        }

                        _.each(layers, function (layer) {
                            trackers[id].unshift(layer);
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

