angular.module('stealth.core.utils')

.directive('stFloatSlider', [
'$log',
function ($log) {
    $log.debug('stealth.core.utils.stFloatSlider: directive defined');
    return {
        require: 'ngModel',
        link: function(scope, element, attrs, controller) {
            controller.$parsers.unshift(function (sliderValue) {
                return parseFloat(sliderValue);
            });
        }
    };
}])

//Especially useful when setting up a skeleton with stWidgetCompiler
.directive('stPlaceholder', [
'$log',
function ($log) {
    $log.debug('stealth.core.utils.stPlaceholder: directive defined');
    return {
        template: '<div>Placeholder</div>'
    };
}])

.filter('lodash', function () {
    return function (value, fnName) {
        return _[fnName].apply(this, [value].concat(Array.prototype.slice.call(arguments, 2)));
    };
})

.filter('momentFormat', function () {
    return function (value, format) {
        return value.format(format);
    };
})

.filter('cors', function () {
    return function (url, path, omitProxy) {
        var uri = url.replace(/\/+$/, '');
        if (!_.isEmpty(path)) {
           uri += '/' + path;
        }
        if (!omitProxy) {
            uri = 'cors/' + uri;
        }
        return uri;
    };
})

.directive('stUtcMomentFormat', [
function () {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function (scope, element, attrs, ngModelCtrlr) {
            var format = attrs.stUtcMomentFormat || 'YYYY-MM-DD HH:mm';
            ngModelCtrlr.$parsers.unshift(function (value) {
                return moment.utc(value, format);
            });
            ngModelCtrlr.$formatters.push(function (value) {
                return value.format(format);
            });
        }
    };
}])

.value('uiJqConfig', {
    spinner: {
        incremental: false,
        stop: function () {
            $(this).change();
        }
    }
})

.filter('startFrom', [
function () {
    return function (input, start) {
        if (_.isArray(input)) {
            start = +start; //parse to int
            if (start < 0) {
                start = 0;
            }
            if (start > input.length - 1) {
                start = input.length;
            }
            return input.slice(start);
        }
        return 0;
    };
}])

//Replacement for regular string.split() that will
//split only the number of times specified by limit.
.filter('splitLimit', [
function () {
    return function (text, delimiter, limit) {
        var arr = text.split(delimiter);
        var result = arr.splice(0, limit);
        result.push(arr.join(delimiter));
        return result;
    };
}])
;
