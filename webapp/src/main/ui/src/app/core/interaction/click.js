angular.module('stealth.core.interaction.click', [
    'stealth.core.geo.ol3.map'
])

.service('mapClickService', [
'$log',
'$rootScope',
'ol3Map',
function ($log, $rootScope, ol3Map) {
    var tag = 'stealth.core.interaction.click: ';
    var _searchables = [];
    var _searchResults = [];

    this.search = function (coord, callback) {
        $log.debug(tag + 'Starting new click search.');
        var _searchResults = [];
        var resolution = ol3Map.getResolution();
        var promises = _.flatten(_.map(_searchables, function (search) {
            return search(coord, resolution);
        }));
        var invokeCallback = function (results) {
            $rootScope.$evalAsync(function () {
                callback(results);
            });
        };
        if (promises.length === 0) {
            $log.debug(tag + 'No layers were queried.');
            invokeCallback(_searchResults);
        } else {
            var processResults = function (response) {
                _searchResults.push(response);
                if (_searchResults.length === promises.length) {
                    $log.debug(tag + 'All promises have returned. Passing results to caller.');
                    invokeCallback(_searchResults);
                }
            };
            _.forEach(promises, function (promise) {
                promise.then(processResults, processResults);
            });
        }
    };

    /**
     * The click service expects registree to provide a callback that
     * will return a $q promise that will resolve with an object with
     * the following keys:
     *     name: (String) The name of the layer to be displayed as the
     *                    search header.
     *     isError: (Boolean) If the click query resulted in an error.
     *     [records]: (Array(Object)) An array of search results if the
     *                                query was successfull.
     *     [reason]: (String) The error message to display if the query
     *                        resulted in an error.
     */
    this.registerSearchable = function (callback) {
        $log.debug(tag + 'Registering searchable.');
        _searchables.push(callback);
    };

    $log.debug(tag + 'Service started.');
}])

.controller('ol3MapPopupController', [
'$element',
'$filter',
'$scope',
'mapClickService',
'ol3Map',
function ($element, $filter, $scope, mapClickService, ol3Map) {
    var overlay = new ol.Overlay({
        element: $element
    });
    ol3Map.addOverlay(overlay);
    var mapSize = ol3Map.getSize();
    var _self = this;

    /**
     * Members available to the view.
     */
    this.showPopup = false;
    this.results = [];
    this.lat = parseFloat($element.attr('lat'));
    this.lon = parseFloat($element.attr('lon'));
    this.containerStyle = {
        'max-width': mapSize[0] * 0.6 + 'px',
        'max-height': mapSize[1] * 0.6 + 'px'
    };
    this.stopDrag = function (event) {
        event.stopPropagation();
    };
    this.removeRecord = function (result, index) {
        if (result.records.length > index) {
            result.records.splice(index, 1);
            if (result.records.length === 0) {
                _.pull(this.results, result);
                if (this.results.length === 0) {
                    this.closePopup();
                }
            }
        }
    };
    this.getRowColor = function (isEven) {
        var style = {};
        if (isEven) {
            style['background-color'] = '#f1f1f1';
        }
        return style;
    };
    this.getBorder = function (isFirst) {
        var style = {};
        if (!isFirst) {
            style['border-left'] = '1px solid #ddd';
        }
        return style;
    };
    this.removeMaxDimensions = function () {
        delete _self.containerStyle['max-width'];
        delete _self.containerStyle['max-height'];
    };
    this.closePopup = function () {
        this.showPopup = false;
        ol3Map.removeOverlay(overlay);
        $scope.$destroy();
        $element.remove();
    };

    mapClickService.search([this.lon, this.lat], function(responses) {
        _.forEach(responses, function (response) {
            if (!response.isError && response.records.length > 0) {
                _self.results.push(response);
            }
        });
        if (_self.results.length > 0) {
            _self.containerStyle.height = 'auto';
            _self.containerStyle.width = 'auto';
            _self.containerStyle['max-width'] = mapSize[0] * 0.6 + 'px';
            _self.containerStyle['max-height'] = mapSize[1] * 0.6 + 'px';
            _self.showPopup = true;
            overlay.setPosition([_self.lon, _self.lat]);
        } else {
            $scope.$destroy();
            $element.remove();
        }
    });
}])

.directive('stOl3MapPopup', [
function () {
    return {
        scope: {},
        controller: 'ol3MapPopupController',
        controllerAs: 'mapPopCtrl',
        templateUrl: 'core/interaction/mappopup.tpl.html',
        link: function (scope, element, attrs) {
            element.draggable();
            scope.$on('$destroy', function () {
                element.draggable('destroy');
            });
        }
    };
}])

.directive('stOl3MapPopupResize',
function () {
    return {
        restrict: 'A',
        require: '^stOl3MapPopup',
        link: function (scope, element, attrs, ol3MapPopupController) {
            element.resizable({
                start: function (event, ui) {
                    scope.$apply(function () {
                        delete ol3MapPopupController.containerStyle['max-width'];
                        delete ol3MapPopupController.containerStyle['max-height'];
                    });
                }
            });
            scope.$on('$destroy', function () {
                element.resizable('destroy');
            });
        }
    };
})

.directive('stOl3MapPopupBuilder', [
'$compile',
'ol3Map',
function ($compile, ol3Map) {
    return {
        restrict: 'E',
        link: function (scope, element, attrs) {
            ol3Map.on('click', function (event) {
                scope.$evalAsync(function () {
                    var html = '<st-ol3-map-popup lat="' + event.coordinate[1] + '" lon="' +
                        event.coordinate[0] + '"></st-ol3-map-popup>';
                    var el = angular.element(html);
                    element.append(el);
                    $compile(el)(scope);
                });
            });
        }
    };
}])
;
