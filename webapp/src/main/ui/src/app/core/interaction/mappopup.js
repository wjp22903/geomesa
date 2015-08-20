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

    /**
     * Call all registered searchables.
     * @param {number[]} coord - [lon, lat]
     * @param {number} resolution
     * @param {function} callback - invoked when results are ready
     * @param {Scope} parentScope - parent scope for search result displays
     */
    this.search = function (coord, resolution, callback, parentScope) {
        $log.debug(tag + 'Starting new click search.');
        var _searchResults = [];
        var promises = _.flattenDeep(_.map(_searchables, function (search) {
            return search(coord, resolution, parentScope);
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
     *
     * @param {function} callback
     * @returns {number} Unique ID of registered callback
     */
    this.registerSearchable = function (callback) {
        $log.debug(tag + 'Registering searchable.');
        var id = _idSeq++;
        _searchables[id] = callback;
        return id;
    };
    /**
     * Removes a searchable by ID.
     * @param {number} id - the ID returned by registerSearchable()
     */
    this.unregisterSearchableById = function (id) {
        delete _searchables[id];
    };

    $log.debug(tag + 'Service started.');
}])

.controller('ol3MapPopupController', [
'$element',
'$scope',
'$rootScope',
'mapClickSearchService',
'ol3Map',
function ($element, $scope, $rootScope, mapClickSearchService, ol3Map) {
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
    this.maxWidth = Math.ceil(mapSize[0] * 0.35);
    this.maxHeight = Math.ceil(mapSize[1] * 0.35);
    this.results = [];

    /**
     * Methods available to the view.
     */
    /**
     * Bring popup to front.
     */
    this.focus = function () {
        $element.css('z-index', '92');
        $rootScope.$emit('Popup Focus Change', id);
    };
    /**
     * Whether or not popup is pinned.
     * @returns {boolean}
     */
    this.isPinned = function () {
        return isPinned;
    };
    /**
     * Toggle pinned state.
     */
    this.togglePin = function () {
        isPinned = !isPinned;
    };
    /**
     * Close this popup.
     */
    this.closePopup = function () {
        ol3Map.removeOverlay(overlay);
        $scope.$destroy();
        $element.remove();
    };
    /**
     * Initiate search and receive results.
     */
    this.launchSearch = function () {
        mapClickSearchService.search([this.lon, this.lat], ol3Map.getResolution(), function (responses) {
            _.forEach(responses, function (response) {
                if (response) {
                    _.each(_.flattenDeep([response]), function (singleResponse) {
                        if (!singleResponse.isError && singleResponse.widgetDef) {
                            _self.results.push(singleResponse);
                        }
                    });
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
        }, $scope);
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
        } else if (lat < center[1]) {
            return 'bottom-right';
        }
        return 'top-right';
    };
    overlay.setPosition([_self.lon, _self.lat]);
    ol3Map.addOverlay(overlay);

    // Register map listeners.
    var closeUnpinned = function () {
        if (!isPinned) {
            ol3Map.un('click', closeUnpinned);
            _self.closePopup();
        }
    };
    ol3Map.on('click', closeUnpinned);

    // Register scope listeners.
    var unbindFocus = $rootScope.$on('Popup Focus Change', function (event, popupId) { //eslint-disable-line no-unused-vars
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
        link: function (scope, element) {
            element.draggable({
                stop: function () {
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
