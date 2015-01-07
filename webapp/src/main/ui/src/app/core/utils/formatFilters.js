angular.module('stealth.core.utils')

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

.filter('delimitThousands', function () {
    return function (num, delimiter) {
        if (!_.isString(delimiter)) {
            delimiter = ',';
        }
        return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1" + delimiter);
    };
})

.filter('formatMeters', [
'$filter',
function ($filter) {
    return function (meters, numDecimals) {
        if (_.isNumber(meters)) {
            if (!_.isNumber(numDecimals)) {
                numDecimals = 3;
            }
            var prefix = ' ';
            if (meters > 1000) {
                prefix = ' k';
                meters /= 1000;
            }
            return $filter('delimitThousands')(meters.toFixed(numDecimals)) + prefix + 'm';
        } else {
            return '';
        }
    };
}])

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
;
