angular.module('stealth.core.interaction.mappopup', [
    'stealth.core.geo.ol3.map'
])

.run([
'$rootScope',
'$compile',
'ol3Map',
function ($rootScope, $compile, ol3Map) {
    var _idSeq = 0;
    var buildFn = function (event) {
        $rootScope.$evalAsync(function () {
            var html = '<div st-ol3-map-popup lat="' + event.coordinate[1] + '" lon="' +
                event.coordinate[0] + '" popup-id="' + (_idSeq++) + '" ' +
                'style="z-index: 92"></div>';
            var el = angular.element(html);
            angular.element('.primaryDisplay').append(el);
            $compile(el)($rootScope);
        });
    };
    ol3Map.on('click', buildFn);
    $rootScope.$on('wizard:launchWizard', function () {
        ol3Map.un('click', buildFn);
    });
    $rootScope.$on('wizard:closeWizard', function () {
        ol3Map.on('click', buildFn);
    });
}])

.service('mapClickSearchService', [
'$log',
'$rootScope',
function ($log, $rootScope) {
    var tag = 'stealth.core.interaction.mappopup: ';
    var _idSeq = 0;
    var _searchables = {};
    var _searchResults = [];

    this.search = function (coord, resolution, callback) {
        $log.debug(tag + 'Starting new click search.');
        var _searchResults = [];
        var promises = _.flatten(_.map(_searchables, function (search) {
            return search(coord, resolution);
        }));
        var invokeCallback = function (results) {
            $rootScope.$evalAsync(function () {
                callback(results);
            });
        };
        if (promises.length === 0) {
            $log.debug(tag + 'No layers were searched.');
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
        var id = _idSeq++;
        _searchables[id] = callback;
        return id;
    };
    /**
     * Removes a searchable.
     * Requires the ID returned by registerSearchable().
     */
    this.unregisterSearchableById = function (id) {
        delete _searchables[id];
    };

    $log.debug(tag + 'Service started.');
}])

.controller('ol3MapPopupController', [
'$element',
'$filter',
'$scope',
'$rootScope',
'mapClickSearchService',
'ol3Map',
function ($element, $filter, $scope, $rootScope, mapClickSearchService, ol3Map) {
    /**
     * Private members.
     */
    var overlay = new ol.Overlay({
        element: $element,
        insertFirst: false
    });
    var mapSize = ol3Map.getSize();
    var isPinned = false;
    var id = parseInt($element.attr('popup-id'), 10);
    var _self = this;

    /**
     * Members available to the view.
     */
    this.loading = true;
    this.wizardActive = false;
    this.lat = parseFloat($element.attr('lat'));
    this.lon = parseFloat($element.attr('lon'));
    this.maxWidth = Math.ceil(mapSize[0] * 0.5);
    this.maxHeight = Math.ceil(mapSize[1] * 0.5);
    this.results = [];

    /**
     * Methods available to the view.
     */
    this.focus = function () {
        $element.css('z-index', '92');
        $rootScope.$emit('Popup Focus Change', id);
    };
    this.isPinned = function () {
        return isPinned;
    };
    this.togglePin = function () {
        isPinned = !isPinned;
    };
    this.closePopup = function () {
        ol3Map.removeOverlay(overlay);
        $scope.$destroy();
        $element.remove();
    };
    this.launchSearch = function () {
        mapClickSearchService.search([this.lon, this.lat], ol3Map.getResolution(), function(responses) {
            _.forEach(responses, function (response) {
                if (!response.isError && response.records && response.records.length > 0) {
                    _self.results.push(response);
                }
            });
            if (_self.results.length > 0) {
                _self.loading = false;
                $scope.$broadcast('Results Loaded');
                $rootScope.$emit('Popup Focus Change', id);
                overlay.setPositioning(getPositioning(_self.lat, _self.lon));
            } else {
                _self.closePopup();
            }
        });
    };

    // Add overlay to the map and position it at the click site.
    var getPositioning = function (lat, lon) {
        var extent = ol3Map.getExtent();
        var center = ol3Map.getCenter();
        if (lon < (center[0] + 0.15 * (extent[2] - extent[0]))) {
            if (lat < center[1]) {
                return 'bottom-left';
            } else {
                return 'top-left';
            }
        } else {
            if (lat < center[1]) {
                return 'bottom-right';
            } else {
                return 'top-right';
            }
        }
    };
    overlay.setPosition([_self.lon, _self.lat]);
    ol3Map.addOverlay(overlay);

    // Register map listeners.
    var closeUnpinned = function (event) {
        if (!isPinned) {
            ol3Map.un('click', closeUnpinned);
            _self.closePopup();
        }
    };
    ol3Map.on('click', closeUnpinned);

    // Register scope listeners.
    var unbindFocus = $rootScope.$on('Popup Focus Change', function (event, popupId) {
        if (popupId !== id && $element.zIndex() > 85) {
            $element.css('z-index', $element.zIndex() - 1);
        }
    });
    var unbindWizLaunch = $rootScope.$on('wizard:launchWizard', function () {
        _self.wizardActive = true;
        ol3Map.un('click', closeUnpinned);
    });
    var unbindWizClose = $rootScope.$on('wizard:closeWizard', function () {
        _self.wizardActive = false;
        ol3Map.on('click', closeUnpinned);
    });
    $scope.$on('$destroy', function () {
        unbindFocus();
        unbindWizLaunch();
        unbindWizClose();
    });
}])

.directive('stOl3MapPopup', [
function () {
    return {
        restrict: 'A',
        scope: {},
        controller: 'ol3MapPopupController',
        controllerAs: 'mapPopCtrl',
        templateUrl: 'core/interaction/mappopup.tpl.html',
        link: function (scope, element, attrs) {
            element.draggable({
                stop: function (event, ui) {
                    scope.$apply(function () {
                        element.css('width', '');
                        element.parent().css('height', 0);
                    });
                }
            });
            scope.$on('$destroy', function () {
                element.draggable('destroy');
            });
        }
    };
}])
;
