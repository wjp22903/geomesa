angular.module('stealth.common.map.ol.draw.trackEdit', [
    'stealth.common.map.geoFormat'
])

    .directive('trackEdit', [
    'GeoFormat',
    function (GeoFormat) {
        return {
            restrict: 'E',
            templateUrl: 'common/map/ol/draw/trackEdit.tpl.html',
            link: function (scope) {
                var parser = new OpenLayers.Format.GeoJSON(),
                    measureControl = new OpenLayers.Control.Measure(OpenLayers.Handler.Path, { //used for distance calc
                        geodesic: true,
                        map: { //pretend this control is attached to a map
                            getProjectionObject: function () {
                                return new OpenLayers.Projection("EPSG:4326");
                            }
                        }
                    }),
                    showStyle = _.merge(_.cloneDeep(OpenLayers.Feature.Vector.style['default']), {
                        fillColor: '#FF0000',
                        strokeColor: '#FF0000',
                        strokeWidth: 6
                    }),
                    //Only consider first and last points when computing speed.
                    getAvgSpeed = function () {
                        var points = scope.feature.attributes.pointData.features,
                            start = moment(points[0].properties.dtg, 'YYYY-MM-DDTHH:mm:ss.sssZ', true),
                            end = moment(points[points.length - 1].properties.dtg, 'YYYY-MM-DDTHH:mm:ss.sssZ', true);
                        if (start.isValid() && end.isValid() &&
                            scope.trackEdit && _.isArray(scope.trackEdit.totalDist)) {
                            var meters = scope.trackEdit.totalDist[1] === 'm' ? scope.trackEdit.totalDist[0] : scope.trackEdit.totalDist[0] * 1000,
                                timeSpan = end.diff(start, 'seconds');
                            return (meters / timeSpan).toFixed(3) + ' m/s';
                        }
                        return 'unknown';
                    };

                //If start or end time change, update average speed.
                scope.$watch('feature.attributes.pointData.features[0].properties.dtg', function () {
                    if (scope.trackEdit) {
                        scope.trackEdit.avgSpeed = getAvgSpeed();
                    }
                });
                scope.$watch('feature.attributes.pointData.features[feature.attributes.pointData.features.length - 1].properties.dtg', function () {
                    if (scope.trackEdit) {
                        scope.trackEdit.avgSpeed = getAvgSpeed();
                    }
                });

                scope.trackEdit = {
                    decimalToDmsh: GeoFormat.decimalToDmsh,
                    shownPointFeature: null,
                    totalDist: measureControl.getBestLength(scope.feature.geometry), //[length, unit]
                    avgSpeed: getAvgSpeed(),
                    showPoint: function (point) {
                        if (!scope.trackEdit.shownPointFeature) {
                            var shownPointFeature = parser.read(point)[0];
                            shownPointFeature.style = showStyle;
                            scope.trackEdit.shownPointFeature = shownPointFeature;
                            scope.feature.layer.addFeatures([shownPointFeature], {silent: true});
                        }
                    },
                    stopShowPoint: function (point) {
                        scope.feature.layer.removeFeatures([scope.trackEdit.shownPointFeature], {silent: true});
                        scope.trackEdit.shownPointFeature = null;
                    },
                    interpolationError: null,
                    interpolateTimes: function () {
                        scope.trackEdit.interpolationError = null;
                        var info = {
                            index: 0, //index of first point that needs an estimated time
                            time: null, //holds last dtg that we saw, while walking the points
                            distance: 0, //meters
                            speed: null //meters per millisecond
                        }, lastIndex = scope.feature.attributes.pointData.features.length - 1;
                        _.each(scope.feature.attributes.pointData.features, function (point, index) {
                            if (info.time) { //we're remembering a start time
                                //add to the distance since that point with the start time
                                info.distance += OpenLayers.Util.distVincenty(
                                    new OpenLayers.LonLat(scope.feature.attributes.pointData.features[index - 1].geometry.coordinates),
                                    new OpenLayers.LonLat(point.geometry.coordinates)
                                ) * 1000;
                            }
                            //Does current point have a user-specified dtg?
                            if (moment(point.properties.dtg, 'YYYY-MM-DDTHH:mm:ss.sssZ', true).isValid() &&
                                (!point.properties.dtgIsInterpolated ||
                                 point.properties.dtgIsInterpolated.toString() !== 'true')) {
                                if (info.time) {
                                    //We have 2 times. Compute speed and apply to points since info.index.
                                    var timeSpan = (moment(point.properties.dtg, 'YYYY-MM-DDTHH:mm:ss.sssZ').diff(moment(info.time, 'YYYY-MM-DDTHH:mm:ss.sssZ')));
                                    if (timeSpan < 0) {
                                        scope.trackEdit.interpolationError = 'Out of order time at point #' + (index + 1);
                                        return false; //error - break out of _.each
                                    } else if (timeSpan === 0) {
                                        //2 points have the same dtg. Could probably handle this, but make the user adjust the track....for now.
                                        scope.trackEdit.interpolationError = 'Duplicate time at point #' + (index + 1);
                                        return false; //error - break out of _.each
                                    } else {
                                        info.speed = info.distance / timeSpan;
                                        //traverse backwards and apply speed to assign dtg to previous points
                                        _.each(_.range(info.index, index).reverse(), function (estIndex) {
                                            if ((scope.feature.attributes.pointData.features[estIndex].properties.dtgIsInterpolated &&
                                                 scope.feature.attributes.pointData.features[estIndex].properties.dtgIsInterpolated.toString() === 'true') ||
                                                !moment(scope.feature.attributes.pointData.features[estIndex].properties.dtg, 'YYYY-MM-DDTHH:mm:ss.sssZ', true).isValid()) {
                                                var distance = OpenLayers.Util.distVincenty(
                                                        new OpenLayers.LonLat(scope.feature.attributes.pointData.features[estIndex].geometry.coordinates),
                                                        new OpenLayers.LonLat(scope.feature.attributes.pointData.features[estIndex + 1].geometry.coordinates)
                                                    ) * 1000,
                                                    timeDiff = distance / info.speed, //milliseconds
                                                    time = moment(scope.feature.attributes.pointData.features[estIndex + 1].properties.dtg, 'YYYY-MM-DDTHH:mm:ss.sssZ').subtract(timeDiff);
                                                scope.feature.attributes.pointData.features[estIndex].properties.dtg = time.toISOString();
                                                scope.feature.attributes.pointData.features[estIndex].properties.dtgIsInterpolated = 'true';
                                            }
                                        });
                                    }
                                    info.index = index + 1; //assume next point needs an estimated time. if it doesn't, nothing will happen anyway
                                }
                                info.time = point.properties.dtg;
                                info.distance = 0;
                            } else { //no dtg at current point
                                if (index === lastIndex) { //we're at the end
                                    if (info.speed) { //we still have the most recently computed speed
                                        //traverse forwards and apply speed to assign dtg to remaining points
                                        _.each(_.range(info.index, lastIndex + 1), function (estIndex) {
                                            if ((scope.feature.attributes.pointData.features[estIndex].properties.dtgIsInterpolated &&
                                                 scope.feature.attributes.pointData.features[estIndex].properties.dtgIsInterpolated.toString() === 'true') ||
                                                !moment(scope.feature.attributes.pointData.features[estIndex].properties.dtg, 'YYYY-MM-DDTHH:mm:ss.sssZ', true).isValid()) {
                                                var distance = OpenLayers.Util.distVincenty(
                                                        new OpenLayers.LonLat(scope.feature.attributes.pointData.features[estIndex - 1].geometry.coordinates),
                                                        new OpenLayers.LonLat(scope.feature.attributes.pointData.features[estIndex].geometry.coordinates)
                                                    ) * 1000,
                                                    timeDiff = distance / info.speed, //milliseconds
                                                    time = moment(scope.feature.attributes.pointData.features[estIndex - 1].properties.dtg, 'YYYY-MM-DDTHH:mm:ss.sssZ').add(timeDiff);
                                                scope.feature.attributes.pointData.features[estIndex].properties.dtg = time.toISOString();
                                                scope.feature.attributes.pointData.features[estIndex].properties.dtgIsInterpolated = 'true';
                                            }
                                        });
                                    } else { //never had enough info to compute a speed
                                        scope.trackEdit.interpolationError = 'Track must contain at least 2 non-estimated times.';
                                        return false; //break out of _.each
                                    }
                                }
                            }
                        }); //end of _.each
                    }
                };
            }
        };
    }])
;
