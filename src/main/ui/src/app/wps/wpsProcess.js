angular.module('stealth.wps.wpsProcess', [
])

    .service('WpsProcessService', [function () {
        this.addWktInput = function (input, inputEl) {
            inputEl.append("<span>wkt</span>");
        };
        this.addBoundingBoxInput = function (input, inputEl) {
            inputEl.append("<span>bounding box</span>");
        };
        this.addLiteralInput = function (input, inputEl) {
            inputEl.append("<span>literal</span>");
        };
    }])

    .directive('wpsProcessInputForm', [function () {
        return {
            restrict: 'E',
            scope: {
                key: '=',
                value: '='
            },
            templateUrl: 'wps/wpsProcessInputForm.tpl.html'
        };
    }])

    .directive('wpsProcessInput', ['WpsProcessService', function (WpsProcessService) {
        return {
            restrict: 'E',
            scope: {
                input: '='
            },
            templateUrl: 'wps/wpsProcessInput.tpl.html'
        };
    }])

;
