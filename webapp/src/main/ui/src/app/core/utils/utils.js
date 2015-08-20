angular.module('stealth.core.utils')

.directive('stFloatInput', [
'$log',
function ($log) {
    $log.debug('stealth.core.utils.stFloatInput: directive defined');
    return {
        require: 'ngModel',
        link: function (scope, element, attrs, controller) { //eslint-disable-line no-unused-vars
            controller.$parsers.unshift(function (value) {
                return parseFloat(value);
            });
            controller.$formatters.push(function (value) {
                return value.toString(10);
            });
        }
    };
}])

.directive('stIntInput', [
'$log',
function ($log) {
    $log.debug('stealth.core.utils.stIntInput: directive defined');
    return {
        require: 'ngModel',
        link: function (scope, element, attrs, controller) { //eslint-disable-line no-unused-vars
            controller.$parsers.unshift(function (value) {
                return parseInt(value, 10);
            });
            controller.$formatters.push(function (value) {
                return value.toString(10);
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
        link: function (scope, element, attrs, ngModelCtrlr) { //eslint-disable-line no-unused-vars
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

.directive('stSelectTextOnFocus', [
'$timeout',
function ($timeout) {
    return {
        restrict: 'A',
        link: function (scope, element) { //eslint-disable-line no-unused-vars
            if (element.is("input:text,textarea")) {
                element.on('focus', function () {
                    $timeout(function () {
                        element.select();
                    }, 5);
                });
            }
        }
    };
}])

.directive('stEnter', [
'$parse',
function ($parse) {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            var fn = $parse(attrs['stEnter']);
            if (_.isFunction(fn)) {
                element.on('keypress', function (event) {
                    if (event.keyCode === 13) {
                        scope.$evalAsync(function () {
                            fn(scope);
                        });
                    }
                });
            }
        }
    };
}])
;
