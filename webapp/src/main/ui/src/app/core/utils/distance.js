angular.module('stealth.core.utils')

/**
 * Uses OL3 distance calculator.
 * Takes an array of [lon, lat] arrays.
 */
.filter('distanceVincenty', function () {
	return function (coords) {
		var distance = 0;
		if (_.isArray(coords) && coords.length > 1) {
			for (var i = 1; i < coords.length; i++) {
				distance += ol.ellipsoid.WGS84.vincentyDistance(coords[i-1], coords[i]);
			}
		}
		return distance;
	};
})
;
