angular.module('stealth.common.filters', [])

.filter('formatMToDHM', function() {
    var times = [
        {unit: 'd', base: 1440},
        {unit: 'h', base: 60},
        {unit: 'm', base: 1}
    ];
    return function(input) {
        var remaining = parseInt(input);
        var formatted = '';
        if (remaining === 0) {
            formatted = '0m';
        } else {
            angular.forEach(times, function(elem, index) {
                var value = Math.floor(remaining / elem.base);
                if (value > 0) {
                    if (value < 10) {
                        formatted += '0' + value + '' + elem.unit + '';
                    } else {
                        formatted += value + '' + elem.unit + '';
                    }
                }
                remaining -= value * elem.base;
            });
        }
        return formatted;
    };
})

.filter('formatSToDHMS', function() {
    var times = [
        {unit: 'd', base: 86400},
        {unit: 'h', base: 3600},
        {unit: 'm', base: 60},
        {unit: 's', base: 1}
    ];
    return function(input) {
        var remaining = parseInt(input);
        var formatted = '';
        if (remaining === 0) {
            formatted = '0s';
        } else {
            angular.forEach(times, function(elem, index) {
                var value = Math.floor(remaining / elem.base);
                if (value > 0) {
                    if (value < 10) {
                        formatted += '0' + value + '' + elem.unit + '';
                    } else {
                        formatted += value + '' + elem.unit + '';
                    }
                }
                remaining -= value * elem.base;
            });
        }
        return formatted;
    };
})

;
