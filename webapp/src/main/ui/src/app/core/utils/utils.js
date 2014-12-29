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

.filter('isEmpty', function () {
    return function (value) {
        return _.isEmpty(value);
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
;
