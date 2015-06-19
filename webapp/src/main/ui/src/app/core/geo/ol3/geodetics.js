angular.module('stealth.core.geo.ol3.geodetics')

/**
 * Uses OL3 for geodetic calculations.
 */
.service('ol3Geodetics', [
function () {
    var _distance = function (earth, fnName, coords) {
        var distance = 0;
        if (_.isArray(coords) && coords.length > 1) {
            for (var i = 1; i < coords.length; i++) {
                distance += earth[fnName].call(earth, coords[i-1], coords[i]);
            }
        }
        return distance;
    };

    //WGS84 ellipsoid
    var _ellipsoid = new ol.Ellipsoid(6378137, 1 / 298.257223563);

    //Uses mean radius: https://en.wikipedia.org/wiki/Earth_radius#Mean_radius
    var _sphere = new ol.Sphere(6371009);

    /* ----- API ----- */
    /**
     * Calculates Vincenty distance of line defined by coords.
     * Uses WGS84 ellipsoid
     * @param {ol.Coordinate[]} coords
     * @returns {Number} distance in meters
     */
    this.distanceVincenty = _.partial(_distance, _ellipsoid, 'vincentyDistance');

    /**
     * Calculates Haversine distance of line defined by coords.
     * Uses sphere with mean earth radius.
     * @see https://en.wikipedia.org/wiki/Earth_radius#Mean_radius
     * @param {ol.Coordinate[]} coords
     * @returns {Number} distance in meters
     */
    this.distanceHaversine = _.partial(_distance, _sphere, 'haversineDistance');
}])
;
