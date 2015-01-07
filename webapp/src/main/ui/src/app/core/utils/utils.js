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
        return _[fnName](value);
    };
})

.filter('cors', function () {
    return function (url, path, omitProxy) {
        var uri = url.replace(/\/+$/, '');
        uri += '/' + path;
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
;
