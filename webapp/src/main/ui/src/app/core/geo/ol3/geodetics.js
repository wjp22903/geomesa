angular.module('stealth.core.geo.ol3.geodetics')

/**
 * Uses OL3 for geodetic calculations.
 */
.service('ol3Geodetics', [
'stealth.core.geo.ol3.geodetics.Ellipsoid',
function (Ellipsoid) {
    var _distance = function (earth, fnName, coords) {
        var distance = 0;
        if (_.isArray(coords) && coords.length > 1) {
            for (var i = 1; i < coords.length; i++) {
                distance += earth[fnName](coords[i-1], coords[i]);
            }
        }
        return distance;
    };

    //WGS84 ellipsoid
    var _ellipsoid = new Ellipsoid(6378137, 1 / 298.257223563);

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

/**
 * Taken directly from:
 *     https://github.com/openlayers/ol3/blob/v3.5.0/src/ol/ellipsoid/ellipsoid.js
 * We want to use that class, but it is not included in OL's production build.
 */
.factory('stealth.core.geo.ol3.geodetics.Ellipsoid', [
function () {
    /**
     * @param {number} a Major radius.
     * @param {number} flattening Flattening.
     * @class
     */
    var Ellipsoid = function (a, flattening) {
        this.a = a;
        this.flattening = flattening;
        this.b = this.a * (1 - this.flattening);
        this.eSquared = 2 * flattening - flattening * flattening;
        this.e = Math.sqrt(this.eSquared);
    };

    /**
     * @param {ol.Coordinate} c1 Coordinate 1.
     * @param {ol.Coordinate} c2 Coordinate 1.
     * @param {number} [opt_minDeltaLambda=1e-12] Minimum delta lambda for convergence.
     * @param {number} [opt_maxIterations=100] Maximum iterations.
     * @returns {{distance: number, initialBearing: number, finalBearing: number}}
     */
    Ellipsoid.prototype.vincenty = function (c1, c2, opt_minDeltaLambda, opt_maxIterations) {
        var minDeltaLambda = _.isUndefined(opt_minDeltaLambda) ? 1e-12 : opt_minDeltaLambda;
        var maxIterations = _.isUndefined(opt_maxIterations) ? 100 : opt_maxIterations;
        var f = this.flattening;
        var lat1 = math.unit(c1[1], 'deg').toNumber('rad');
        var lat2 = math.unit(c2[1], 'deg').toNumber('rad');
        var deltaLon = math.unit(c2[0] - c1[0], 'deg').toNumber('rad');
        var U1 = Math.atan((1 - f) * Math.tan(lat1));
        var cosU1 = Math.cos(U1);
        var sinU1 = Math.sin(U1);
        var U2 = Math.atan((1 - f) * Math.tan(lat2));
        var cosU2 = Math.cos(U2);
        var sinU2 = Math.sin(U2);
        var lambda = deltaLon;
        var cosSquaredAlpha, sinAlpha;
        var cosLambda, deltaLambda = Infinity, sinLambda;
        var cos2SigmaM, cosSigma, sigma, sinSigma;
        var i;
        for (i = maxIterations; i > 0; --i) {
            cosLambda = Math.cos(lambda);
            sinLambda = Math.sin(lambda);
            var x = cosU2 * sinLambda;
            var y = cosU1 * sinU2 - sinU1 * cosU2 * cosLambda;
            sinSigma = Math.sqrt(x * x + y * y);
            if (sinSigma === 0) {
                return {
                    distance: 0,
                    initialBearing: 0,
                    finalBearing: 0
                };
            }
            cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
            sigma = Math.atan2(sinSigma, cosSigma);
            sinAlpha = cosU1 * cosU2 * sinLambda / sinSigma;
            cosSquaredAlpha = 1 - sinAlpha * sinAlpha;
            cos2SigmaM = cosSigma - 2 * sinU1 * sinU2 / cosSquaredAlpha;
            if (isNaN(cos2SigmaM)) {
                cos2SigmaM = 0;
            }
            var C = f / 16 * cosSquaredAlpha * (4 + f * (4 - 3 * cosSquaredAlpha));
            var lambdaPrime = deltaLon + (1 - C) * f * sinAlpha * (sigma +
                C * sinSigma * (cos2SigmaM +
                    C * cosSigma * (2 * cos2SigmaM * cos2SigmaM - 1)));
            deltaLambda = Math.abs(lambdaPrime - lambda);
            lambda = lambdaPrime;
            if (deltaLambda < minDeltaLambda) {
                break;
            }
        }
        if (i === 0) {
            return {
                distance: NaN,
                finalBearing: NaN,
                initialBearing: NaN
            };
        }
        var aSquared = this.a * this.a;
        var bSquared = this.b * this.b;
        var uSquared = cosSquaredAlpha * (aSquared - bSquared) / bSquared;
        var A = 1 + uSquared / 16384 *
            (4096 + uSquared * (uSquared * (320 - 175 * uSquared) - 768));
        var B = uSquared / 1024 *
            (256 + uSquared * (uSquared * (74 - 47 * uSquared) - 128));
        var deltaSigma = B * sinSigma * (cos2SigmaM + B / 4 *
            (cosSigma * (2 * cos2SigmaM * cos2SigmaM - 1) -
                B / 6 * cos2SigmaM * (4 * sinSigma * sinSigma - 3) *
                    (4 * cos2SigmaM * cos2SigmaM - 3)));
        cosLambda = Math.cos(lambda);
        sinLambda = Math.sin(lambda);
        var alpha1 = Math.atan2(cosU2 * sinLambda, cosU1 * sinU2 - sinU1 * cosU2 * cosLambda);
        var alpha2 = Math.atan2(cosU1 * sinLambda, cosU1 * sinU2 * cosLambda - sinU1 * cosU2);
        return {
            distance: this.b * A * (sigma - deltaSigma),
            initialBearing: math.unit(alpha1, 'rad').toNumber('deg'),
            finalBearing: math.unit(alpha2, 'rad').toNumber('deg')
        };
    };

    /**
     * Returns the distance from c1 to c2 using Vincenty.
     *
     * @param {ol.Coordinate} c1 Coordinate 1.
     * @param {ol.Coordinate} c2 Coordinate 1.
     * @param {number} [opt_minDeltaLambda=1e-12] Minimum delta lambda for convergence.
     * @param {number} [opt_maxIterations=100] Maximum iterations.
     * @returns {number} Vincenty distance.
     */
    Ellipsoid.prototype.vincentyDistance = function (c1, c2, opt_minDeltaLambda, opt_maxIterations) {
        var vincenty = this.vincenty(c1, c2, opt_minDeltaLambda, opt_maxIterations);
        return vincenty.distance;
    };

    /**
     * Returns the final bearing from c1 to c2 using Vincenty.
     *
     * @param {ol.Coordinate} c1 Coordinate 1.
     * @param {ol.Coordinate} c2 Coordinate 1.
     * @param {number} [opt_minDeltaLambda=1e-12] Minimum delta lambda for convergence.
     * @param {number} [opt_maxIterations=100] Maximum iterations.
     * @returns {number} Final bearing.
     */
    Ellipsoid.prototype.vincentyFinalBearing = function (c1, c2, opt_minDeltaLambda, opt_maxIterations) {
        var vincenty = this.vincenty(c1, c2, opt_minDeltaLambda, opt_maxIterations);
        return vincenty.finalBearing;
    };

    /**
     * Returns the initial bearing from c1 to c2 using Vincenty.
     *
     * @param {ol.Coordinate} c1 Coordinate 1.
     * @param {ol.Coordinate} c2 Coordinate 1.
     * @param {number} [opt_minDeltaLambda=1e-12] Minimum delta lambda for convergence.
     * @param {number} [opt_maxIterations=100] Maximum iterations.
     * @returns {number} Initial bearing.
     */
    Ellipsoid.prototype.vincentyInitialBearing = function (c1, c2, opt_minDeltaLambda, opt_maxIterations) {
        var vincenty = this.vincenty(c1, c2, opt_minDeltaLambda, opt_maxIterations);
        return vincenty.initialBearing;
    };

    return Ellipsoid;
}])
;
