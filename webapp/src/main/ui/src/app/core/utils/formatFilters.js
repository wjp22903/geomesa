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

;
