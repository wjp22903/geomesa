angular.module('stealth.core.geo.ol3.utils', [
    'stealth.core.geo.ol3.geodetics'
])

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
}])

.service('routeDrawHelper', [
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
                feature.get('pointData').features.push({
                    id: _.now() + '_' + index,
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'Point',
                        coordinates: coord
                    }
                });
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
                var newPoint = {
                        id: id,
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'Point',
                            coordinates: coord
                        }
                    },
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
        feature.unset('pointData');
    };
}])
;
