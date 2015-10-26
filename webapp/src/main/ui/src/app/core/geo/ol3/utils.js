angular.module('stealth.core.geo.ol3.utils', [
    'stealth.core.geo.ol3.geodetics'
])

.constant('stealth.core.geo.ol3.utils.numberDotStyle', {
    style: function () {
        return function (feature) {
            return [new ol.style.Style({
                image: new ol.style.Circle({
                    radius: 9,
                    fill: new ol.style.Fill({
                        color: '#BDDADA'
                    }),
                    stroke: new ol.style.Stroke({
                        color: '#000000',
                        width: 2
                    })
                }),
                text: new ol.style.Text({
                    textAlign: 'center',
                    textBaseline: 'middle',
                    text: feature.get('name'),
                    fill: new ol.style.Fill({
                        color: '#000'
                    }),
                    stroke: new ol.style.Stroke({color: '#000', width: 1}),
                    offsetX: -0.5,
                    offsetY: 1
                })
            })];
        };
    }
})

.service('stealth.core.geo.ol3.utils.geomHelper', [
function () {
    var flipPt = function (yx) {
        var size = _.size(yx);
        if (size === 2) {
            return [yx[1], yx[0]];
        } else if (size === 3) {
            return [yx[1], yx[0], yx[2]];
        } else {
            return yx;
        }
    };
    var flipDeep = function (a) {
        if (_.isArray(a[0])) {
            return _.map(a, flipDeep);
        } else {
            return flipPt(a);
        }
    };

    this.flipXY = function (geom) {
        geom.setCoordinates(flipDeep(geom.getCoordinates()));
    };

    this.polygonFromExtent = function (extent) {
        return this.polygonFromExtentParts(extent[0], extent[1], extent[2], extent[3]);
    };

    this.polygonFromExtentParts = function (minLon, minLat, maxLon, maxLat) {
        return new ol.geom.Polygon([[
            [minLon, minLat],
            [minLon, maxLat],
            [maxLon, maxLat],
            [maxLon, minLat],
            [minLon, minLat]
        ]]);
    };
}])

.service('stealth.core.geo.ol3.utils.routeDrawHelper', [
'ol3Geodetics',
function (ol3Geodetics) {
    this.initFeature = function (feature, scope, moreInit) {
        var coords = feature.getGeometry().getCoordinates();
        scope.routeInfo = {
            coords: coords,
            meters: ol3Geodetics.distanceVincenty(coords)
        };
        if (!feature.get('pointData')) {
            feature.set('pointData', {
                type: 'FeatureCollection',
                features: []
            });
            _.each(coords, function (coord, index) {
                feature.get('pointData').features.push(new ol.Feature({
                    id: _.now() + '_' + index,
                    geometry: new ol.geom.Point(coord)
                }));
            });
        }
        feature.changeListenerKey = feature.on('change', function (evt2) {
            var coords = evt2.target.getGeometry().getCoordinates();
            scope.$evalAsync(function () {
                scope.routeInfo.coords = coords;
                scope.routeInfo.meters = ol3Geodetics.distanceVincenty(coords);
            });
            var newPointData = {
                type: 'FeatureCollection',
                features: []
            };
            _.each(evt2.target.getGeometry().getCoordinates(), function (coord, index) {
                var id = _.now() + '_' + index;
                var newPoint = new ol.Feature({
                        id: id,
                        geometry: new ol.geom.Point(coord)
                    }),
                    oldPoint = _.find(evt2.target.get('pointData').features, {id: id});
                if (oldPoint) {
                    newPoint.properties = oldPoint.properties;
                }
                newPointData.features.push(newPoint);
            });
            evt2.target.set('pointData', newPointData);
        });
        scope.$evalAsync(function () {
            scope.geoFeature = feature;
            if (_.isFunction(moreInit)) {
                moreInit();
            }
        });
    };
    this.detachFeature = function (feature) {
        if (feature.changeListenerKey) {
            feature.unByKey(feature.changeListenerKey);
        }
        delete feature.changeListenerKey;
        feature.set('pointData', {});
    };
}])

.service('stealth.core.geo.ol3.utils.trackDrawHelper', [
'ol3Geodetics',
'$timeout',
function (ol3Geodetics, $timeout) {
    var _self = this;
    this.initFeature = function (feature, scope, moreInit) {
        if (!feature.get('pointData')) {
            var pdFeaturesArr = _.map(feature.getGeometry().getCoordinates(), function (coord, index) {
                var newFeature = new ol.Feature({
                    id: _.now() + '_' + index,
                    dtgIsInterpolated: false,
                    dtg: '',
                    geometry: new ol.geom.Point(coord)
                });
                newFeature.linkDtg = newFeature.get('dtg');
                return newFeature;
            });
            feature.set('pointData', {
                type: 'FeatureCollection',
                features: pdFeaturesArr
            });
        }
        this.initTrackInfo(feature, scope);
        feature.changeListenerKey = feature.on('change', function (event) {
            _self.mapDrawChangeListener(event, scope);
        });
        scope.$evalAsync(function () {
            scope.geoFeature = feature;
            if (_.isFunction(moreInit)) {
                moreInit();
            }
        });
    };
    this.mapDrawChangeListener = function (event, scope) {
        var coords = event.target.getGeometry().getCoordinates(),
            lastCoordsIndex = coords.length - 1,
            pdFeatures = event.target.get('pointData').features;
        $timeout(function () {
            scope.trackInfo.meters = ol3Geodetics.distanceVincenty(coords);
        });
        if (pdFeatures.length === coords.length) {
            _.each(coords, function (coord, index) {
                pdFeatures[index].getGeometry().setCoordinates(coord);
            });
        } else {
            pdFeatures.push(new ol.Feature({
                id: _.now() + '_' + lastCoordsIndex,
                dtgIsInterpolated: false,
                dtg: '',
                geometry: new ol.geom.Point(coords[lastCoordsIndex])
            }));
        }
    };
    this.loadFeature = function (feature, scope) {
        this.initTrackInfo(feature, scope);
        // wrap each date in a Moment.js
        _.each(feature.get('pointData').features, function (pdFeature) {
            if (pdFeature.get('dtg')) {
                pdFeature.set('dtg', moment(pdFeature.get('dtg'), moment.ISO_8601).utc());
                pdFeature.linkDtg = pdFeature.get('dtg');
            }
            if (pdFeature.get('dtgIsInterpolated') !== true) {
                pdFeature.set('dtgIsInterpolated', (pdFeature.get('dtgIsInterpolated') === "true"));
            }
        });
        scope.featureOverlay.getFeatures().clear();
        scope.featureOverlay.addFeature(feature);
        scope.geoFeature = feature;
        this.updateAvgSpeed(scope);
    };
    this.detachFeature = function (feature) {
        if (feature.changeListenerKey) {
            feature.unByKey(feature.changeListenerKey);
        }
        delete feature.changeListenerKey;
    };
    this.initTrackInfo = function (feature, scope) {
        scope.trackInfo = {
            meters: ol3Geodetics.distanceVincenty(feature.getGeometry().getCoordinates()),
            pdFeatures: feature.get('pointData').features,
            avgSpeed: 'unknown'
        };
    };
    this.updateAvgSpeed = function (scope) {
        var pdFeaturesArr = scope.geoFeature.get('pointData').features,
            start = pdFeaturesArr[0].get('dtg'),
            end = pdFeaturesArr[pdFeaturesArr.length - 1].get('dtg');
        this.validateDtgFields(scope);
        if (moment.isMoment(start) && start.isValid() && moment.isMoment(end) && end.isValid() &&
            scope.trackInfo.meters > 0) {
            var timeSpan = end.diff(start, 'seconds');
            scope.trackInfo.avgSpeed = (scope.trackInfo.meters / timeSpan).toFixed(3) + ' m/s';
        } else {
            scope.trackInfo.avgSpeed = 'unknown';
        }
    };
    this.validateDtgFields = function (scope) {
        // initialize to true then attempt to disprove
        scope.trackInfo.allDtgValid = true;
        _.each(scope.geoFeature.get('pointData').features, function (pdFeature) {
            var dtg = pdFeature.get('dtg');
            if (!moment.isMoment(dtg) || !dtg.isValid()) {
                scope.trackInfo.allDtgValid = null;
                return;
            }
        });
    };
    this.interpolateTimes = function (pdFeaturesArr, coords) {
        var interpolationError = null,
            firstPtIndex = 0, // index of first point that needs an estimated time
            dtgBuffer = null, // holds last dtg that we saw, while walking the points
            distanceBuffer = 0, // meters between current and last points
            speed = null, // meters per millisecond
            lastIndex = pdFeaturesArr.length - 1,
            applySpeedtoTime = function (estIndex, otherIndex) {
                if (!!pdFeaturesArr[estIndex].get('dtgIsInterpolated') ||
                    !moment.isMoment(pdFeaturesArr[estIndex].get('dtg')) ||
                    !pdFeaturesArr[estIndex].get('dtg').isValid()) { // or moment isn't set to anything...
                    var distance = ol3Geodetics.distanceVincenty([coords[estIndex], coords[otherIndex]]),
                        timeDiff = (distance / speed);
                    if (estIndex < otherIndex) {
                        // we're traversing backwards, so subtract
                        pdFeaturesArr[estIndex].set('dtg', pdFeaturesArr[otherIndex].get('dtg').clone().subtract(timeDiff));
                    } else {
                        // we're traversing forwards, so add
                        pdFeaturesArr[estIndex].set('dtg', pdFeaturesArr[otherIndex].get('dtg').clone().add(timeDiff));
                    }
                    pdFeaturesArr[estIndex].linkDtg = pdFeaturesArr[estIndex].get('dtg');
                    pdFeaturesArr[estIndex].set('dtgIsInterpolated', true);
                }
            };
        _.each(pdFeaturesArr, function (pdFeature, index) {
            if (dtgBuffer) {
                distanceBuffer += ol3Geodetics.distanceVincenty([coords[index - 1], coords[index]]);
            }
            // Does current pdFeature have a user-specified dtg?
            if (moment.isMoment(pdFeature.get('dtg')) && pdFeature.get('dtg').isValid() && !pdFeature.get('dtgIsInterpolated')) {
                if (dtgBuffer) {
                    // We have 2 times. Compute speed and apply to points since firstPtIndex.
                    var timeSpan = pdFeature.get('dtg').diff(dtgBuffer);
                    if (timeSpan < 0) {
                        interpolationError = 'Out of order time at point #' + (index + 1);
                        return false; // error - break out of _.each
                    } else if (timeSpan === 0) {
                        // 2 points have the same dtg. Could probably handle this, but make the user adjust the track....for now.
                        interpolationError = 'Duplicate time at point #' + (index + 1);
                        return false; // error - break out of _.each
                    } else {
                        speed = distanceBuffer / timeSpan;
                        // traverse backwards and apply speed to assign dtg to previous points
                        _.each(_.range(firstPtIndex, index).reverse(), function (estIndex) {
                            applySpeedtoTime(estIndex, estIndex + 1);
                        });
                    }
                    firstPtIndex = index + 1; // assume next point needs an estimated time. if it doesn't, nothing will happen anyway
                }
                dtgBuffer = pdFeature.get('dtg');
                distanceBuffer = 0;
            } else if (index === lastIndex) { // no dtg at current point
                // we're at the end
                if (speed) { // we still have the most recently computed speed
                    // traverse forwards and apply speed to assign dtg to remaining points
                    _.each(_.range(firstPtIndex, lastIndex + 1), function (estIndex) {
                        applySpeedtoTime(estIndex, estIndex - 1);
                    });
                } else { // never had enough info to compute a speed
                    interpolationError = 'Track must contain at least 2 non-estimated times.';
                    return false; // break out of _.each
                }
            }
        }); // end _.each()
        return interpolationError;
    };
}])

.service('stealth.core.geo.ol3.utils.sitesDrawHelper', [
'$timeout',
function ($timeout) {
    this.initFeature = function (feature, scope, moreInit) {
        $timeout(function () {
            if (!scope.geoFeature) {
                scope.geoFeature = feature; // must be ol.collection - enforce?
            }
            if (!scope.sitesInfo) {
                scope.sitesInfo = {
                    nameCounter: 1
                };
            }
            scope.sitesInfo.pdFeatures = scope.geoFeature;
        });
        scope.$evalAsync(function () {
            if (_.isFunction(moreInit)) {
                moreInit();
            }
        });
    };
    this.detachFeature = function (feature) {
        if (feature.changeListenerKey) {
            feature.unByKey(feature.changeListenerKey);
        }
        delete feature.changeListenerKey;
    };
}])
;
