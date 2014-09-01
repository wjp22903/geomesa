angular.module('stealth.ows.airTrackHistory', [
    'stealth.ows.ows'
])
    .factory('AirTrackHistory',
        ['CONFIG', 'WFS', '$rootScope',
        function (CONFIG, WFS, $rootScope) {

            var initiateQuery = function (feature, style) {
                var _properties = feature.properties || {"hexid": "none"};
                var _style = style || {
                    "color": '#000000',
                    "weight": 5,
                    "opacity": 1.00
                };

                var url = CONFIG.geoserver.defaultUrl;
                var layerName = CONFIG.airTracker.data.layer;
                var key = CONFIG.airTracker.data.threadingKey;
                var paramOverrides = {
                    cql_filter: '(' + key + '=\'' + _properties.hexid + '\')',
                    sortBy: 'dtg'
                };

                if (CONFIG.geoserver.hasOwnProperty('omitProxy')) {
                    WFS.getFeature(url, layerName, paramOverrides,
                                   CONFIG.geoserver.omitProxy)
                        .success(success)
                        .error(failed);
                } else {
                    WFS.getFeature(url, layerName, paramOverrides)
                        .success(success)
                        .error(failed);
                }

                function success(data, status) {
                    var points = data.features;
                    if (!_.isArray(points)) {
                        points = [];
                    }
                    if (points.length < 1) {
                        alert('No results found.');
                    } else {
                        var collection = buildCollection(points);
                        $rootScope.$emit('new track history',
                                         collection,
                                         _style);
                    }
                }

                var buildCollection = function (points) {
                    var collection = {
                        "type": "FeatureCollection",
                        "features": []
                    };

                    var lineStr = "";
                    var pntsCoords = [points[0].geometry.coordinates];
                    var numPnts = points.length;
                    for (var pnt=1; pnt<numPnts; ++pnt) {
                        var coords0 = points[pnt-1].geometry.coordinates;
                        var coords1 = points[pnt].geometry.coordinates;
                        var lon0 = coords0[0];
                        var lon1 = coords1[0];
                        var diff = Math.abs(lon1 - lon0);
                        if (diff < 180) {
                            pntsCoords.push(coords1);
                        } else {
                            if (pntsCoords.length>1) { // Need 2 points to build a line string.
                                lineStr = buildLineString(pntsCoords);
                                pntsCoords = [coords1];
                                collection.features.push(lineStr);
                            }
                        }
                    }

                    if (pntsCoords.length>1) { // Need 2 points to build a line string.
                        lineStr = buildLineString(pntsCoords);
                        pntsCoords = [];
                        collection.features.push(lineStr);
                    }
                    return collection;
                };

                var buildLineString = function (coords) {
                    var lineString = {
                        "type": "Feature",
                        "geometry": {
                            "type": "LineString",
                            "coordinates": coords
                        },
                        "properties": _properties
                    };

                    return lineString;
                };

                function failed(data, status) {
                    alert('Failed query: ' + status);
                }
            };

            return {
                initiateQuery: initiateQuery
            };
        }
    ])
;
