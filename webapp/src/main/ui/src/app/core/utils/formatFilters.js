angular.module('stealth.core.utils')

/**
 * Formats a duration in millis in days, hours, minutes, and seconds.
 * @param {Number} millis - Milliseconds to format
 *
 * @returns {string} Duration in DHMS format
 */
.filter('millisToDHMS', [
function () {
    var times = [
        {unit: 'd', base: 86400},
        {unit: 'h', base: 3600},
        {unit: 'm', base: 60},
        {unit: 's', base: 1}
    ];

    return function(millis) {
        var remaining = (millis / 1000) | 0;
        var formatted = '';

        var days = Math.floor(remaining / 86400);
        remaining  -= days * 86400;
        var hours = Math.floor(remaining / 3600);
        remaining  -= hours * 3600;
        var mins = Math.floor(remaining / 60);
        remaining  -= mins * 60;
        var secs = Math.floor(remaining);

        if (0 < days && days < 10) {
            formatted += '0' + days + 'd';
        } else if (9 < days) {
            formatted += days + 'd';
        }

        if (0 < days && hours < 1) {
            formatted += '00h';
        } else if (0 < hours && hours < 10) {
            formatted += '0' + hours + 'h';
        } else if (9 < hours) {
            formatted += hours + 'h';
        }

        if ((0 < days || 0 < hours) && mins < 1) {
            formatted += '00m';
        } else if (0 < mins && mins < 10) {
            formatted += '0' + mins + 'm';
        } else if (9 < mins) {
            formatted += mins + 'm';
        }

        if (secs < 1) {
            formatted += '00s';
        } else if (secs < 10) {
            formatted += '0' + secs + 's';
        } else if (9 < secs) {
            formatted += secs + 's';
        }

        return formatted;
    };
}])

/**
 * Formats a distance in meters with commas and unit (m or km).
 * @param {Number} meters - Meters to format
 * @param {Number} [numDecimals=3] - Decimal places to round to
 *
 * @returns {string} Formatted distance
 */
.filter('formatMeters', [
'$filter',
function ($filter) {
    return function (meters, numDecimals) {
        if (_.isNumber(meters)) {
            var prefix = ' ';
            if (meters > 1000) {
                prefix = ' k';
                meters /= 1000;
            }
            return $filter('numberTrim')(meters, numDecimals) + prefix + 'm';
        } else {
            return '';
        }
    };
}])

/**
 * Formats a coordinate in degrees, minutes, seconds, and hemisphere.
 * @param {{Number[]|Number[][])} coord - [longitude, latitude] coord or an array of coords
 *
 * @returns {(string[]|string[][])} [latitude, longitude] in DMSH or an array of them
 */
.filter('coordToDMSH', function () {
    var format = function (coord) {
        return ol.coordinate.toStringHDMS(coord)
            .replace(/([NnSs]) /, '$1:::').replace(/\s/g, '').split(':::');
    };
    return function (coord) {
        if (_.isArray(coord)) {
            if (_.isNumber(coord[0])) {
                return format(coord);
            } else {
                return _.map(coord, format);
            }
        } else {
            return coord;
        }

    };
})

/**
 * Formats a number with commas, rounds decimals, and trims trailing zeroes.
 * @param {Number} num - Number to format
 * @param {Number} [numDecimals=3] - Decimal places to round to
 *
 * @returns {string} Formatted number
 */
.filter('numberTrim', [
'$filter',
function ($filter) {
    return function (num, numDecimals) {
        var n = $filter('number')(num, numDecimals);
        if (_.isString(n) && n.match(/\./)) {
            n = n.replace(/0+$/, '');
            return n.replace(/\.$/, '');
        }
        return n;
    };
}])
;
