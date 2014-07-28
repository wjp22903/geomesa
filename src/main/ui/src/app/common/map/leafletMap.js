angular.module('stealth.common.map.leafletMap', [
    'stealth.common.map.leafletLayerStyle'
])
    .directive('leafletMap',
    ['$interval', 'CONFIG', 'LayerStyle', function ($interval, CONFIG, LayerStyle) {

        return {
            restrict: 'E',
            replace: true,
            template: '<div class="leaflet-map"></div>',
            link: function (scope, element, attrs) {

                // Configuration:
                var initMapCenter = L.latLng(30, 90);
                var initMapZoom = 4;
                var mapMaxZoom = 9;

                var map = L.map(attrs.id, {
                        center: initMapCenter,
                        zoom: initMapZoom,
                        maxZoom: mapMaxZoom
                    });

                var base = L.tileLayer.wms(CONFIG.map.url,
                    {
                        layers: CONFIG.map.baseLayers,
                        format: CONFIG.map.format,
                        crs: L.CRS.EPSG4326
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
                var overlays = {};
                var overlayStyles = {};
                var colors = {};
                var labels = {};
                var numSegments = {};

                var styles = CONFIG.trackStyles;
                _.each(styles, function(s) {
                    var label = s.labelName;

                    overlays[label] = L.layerGroup();
                    map.addLayer(overlays[label]);

                    overlayStyles[label] = new LayerStyle(s);

                    colors[label] = overlayStyles[label].color;

                    var contributor = s.contributor;
                    labels[contributor] = label;

                    numSegments[label] = s.numSegments;
                });

                airTrackerLayerControl(null, overlays, colors, {position: 'bottomleft', collapsed: false});

                function addGeoJsonLayerToGroup(feature) {
                    var lbl = "";
                    if (feature.properties.isMultisource === true) {
                        lbl = "Multi-source";
                    } else if (feature.properties.isInteresting === true) {
                        lbl = "Interesting";
                    } else {
                        lbl = labels[feature.properties.contributor];
                    }

                    var lyr = L.geoJson(feature, {style: overlayStyles[lbl]});
                    var grp = overlays[label];
                    grp.add(lyr);
                    return {label: lbl, group: grp, layer: lyr};
                }

                // Action for each new track received:
                scope.$on('new track', function (evt, msg) {
                    if(msg.remove) {
                        var removeId = msg.remove;
                        if(trackers[removeId]) {
                            var lyrGrp = trackerGroup[removeId];
                            _.each(trackers[removeId], function (lyr) { lyrGrp.removeLayer(lyr); });
                        }
                    } else {
                        var obj = addGeoJsonLayerToGroup(msg);
                        var label = obj.label;
                        var group = obj.group;
                        var layer = obj.layer;
                        var prop = msg.properties;
                        var id = prop.trackId;
                        var popupText = "Track ID: " + id + "<br>" +
                                        "Hex ID " + prop.hexid + "<br>" +
                                        "Departure: " + prop.departure + "<br>" +
                                        "Contributor: " + prop.contributor;
                        layer.bindPopup(popupText);

                        if (!trackers[id]) {
                            trackers[id] = [];
                            trackerGroup[id] = group;
                        }

                        var coords = msg.geometry.coordinates;
                        for (var c=1; c<coords.length; ++c) {
                            var diff = Math.abs(coords[c-1][0] - coords[c][0]);
                            if (diff > 180) {
                                isGoodLineString = false;
                            } else {
                                isGoodLineString = true;
                            }
                        }

                        trackers[id].unshift(layer);

                        if (trackers[id].length == 1) {
                            for(var i=0; i<trackers[id].length; ++i) {
                              trackerGroup[id].removeLayer(trackers[id][i]);
                            }
                        }

                        var numSeg = numSegments[label];
                        if (trackers[id].length > numSeg) {
                            for(var j=numSeg; j<trackers[id].length; ++j) {
                                trackerGroup[id].removeLayer(trackers[id][j]);
                            }
                        }
                        trackers[id].length = numSeg;

                        if (!isGoodLineString) {
                            for (var k=0; k<trackers[id].length; ++k) {
                                trackerGroup[id].removeLayer(trackers[id][k]);
                            }
                        }
                        trackers[id].length = 0;

                        if (trackers[id].length > 1) {
                            var masterWeight = layer.getLayers()[0].options.weight;
                            var opacity = layer.getLayers()[0].options.opacity;
                            for (var l=0; l<trackers[id].length; ++l) {
                                var curLayer = trackers[id][l].getLayers()[0];
                                var factor = 0.8 * (numSeg - l) / numSeg;
                                curLayer.setStyle(_.merge(curLayer.options, { weight: masterWeight * factor,
                                                                              opacity: opacity * 1.0 }));
                            }
                        }
                    }
                }, true);
            }
        };
    }]);

