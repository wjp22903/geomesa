angular.module('stealth.core.interaction.mapclick', [
    'stealth.core.geo.ol3.map',
    'stealth.core.popup',
    'stealth.core.utils'
])

.run([
'$filter',
'$rootScope',
'ol3Map',
'stealth.core.interaction.mapclick.searchManager',
'stealth.core.popup.popupManager',
'stealth.core.utils.WidgetDef',
function ($filter, $rootScope, ol3Map, searchManager, popupManager, WidgetDef) {
    var _element = angular.element('<div class="fa fa-fw fa-spinner fa-spin fa-lg mapSearchSpinner"></div>');
    var _getPositioning = function (coord) {
        var extent = ol3Map.getExtent();
        var center = ol3Map.getCenter();
        if (coord[0] < (center[0] + 0.15 * (extent[2] - extent[0]))) {
            if (coord[1] < center[1]) {
                return 'bottom-left';
            } else {
                return 'top-left';
            }
        } else if (coord[1] < center[1]) {
            return 'bottom-right';
        } else {
            return 'top-right';
        }
    };
    var _clickListener = function (event) {
        $rootScope.$evalAsync(function () {
            var overlay = new ol.Overlay({
                element: _element,
                position: event.coordinate
            });
            ol3Map.addOverlay(overlay);
            searchManager.search(event.coordinate, ol3Map.getResolution(), function (searchResults) {
                ol3Map.removeOverlay(overlay);
                var popupScope = $rootScope.$new();
                popupScope.results = _(searchResults).filter().flattenDeep().filter(function (result) {
                    return (!result.isError && result.widgetDef);
                }).value();
                if (popupScope.results.length > 0) {
                    var title = '(' + $filter('number')(event.coordinate[1]) + ', ' +
                                $filter('number')(event.coordinate[0]) + ')';
                    var contentDef = new WidgetDef('st-popup-tab-container', popupScope);
                    var eventPixel = ol3Map.getEventPixel(event.originalEvent);
                    popupScope.popupId = popupManager.displayPopup(title, 'fa-search', contentDef, {
                        offsetX: eventPixel[0],
                        offsetY: eventPixel[1],
                        positioning: _getPositioning(event.coordinate),
                        buttons: [{
                            iconClass: 'fa-thumb-tack',
                            extraClasses: function () {
                                return {active: popupScope.isPinned};
                            },
                            onClick: function () {
                                popupScope.isPinned = !popupScope.isPinned;
                            }
                        }],
                        onClose: function () {
                            unbindWizLaunch();
                            unbindWizClose();
                        }
                    });
                    var closeUnpinned = function () {
                        if (!popupScope.isPinned) {
                            ol3Map.un('singleclick', closeUnpinned);
                            popupManager.closePopup(popupScope.popupId);
                        }
                    };
                    var unbindWizLaunch = $rootScope.$on('wizard:launchWizard', function () {
                        ol3Map.un('singleclick', closeUnpinned);
                    });
                    var unbindWizClose = $rootScope.$on('wizard:closeWizard', function () {
                        ol3Map.on('singleclick', closeUnpinned);
                    });
                    ol3Map.on('singleclick', closeUnpinned);
                } else {
                    popupScope.$destroy();
                }
            });
        });
    };

    ol3Map.on('singleclick', _clickListener);

    $rootScope.$on('wizard:launchWizard', function () {
        ol3Map.un('singleclick', _clickListener);
    });

    $rootScope.$on('wizard:closeWizard', function () {
        ol3Map.on('singleclick', _clickListener);
    });
}])

.service('stealth.core.interaction.mapclick.searchManager', [
'$log',
function ($log) {
    var _tag = 'stealth.core.interaction.mapclick.searchManager: ';
    var _idSeq = 0;
    var _searchables = {};

    /**
     * Call all registered searchables.
     * @param {number[]} coord - [lon, lat]
     * @param {function} callback - invoked when results are ready
     * @param {Scope} parentScope - parent scope for search result displays
     */
    this.search = function (coord, resolution, callback, parentScope) {
        $log.debug(_tag + 'Starting new click search.');
        var _searchResults = [];
        var promises = _.flattenDeep(_.map(_searchables, function (search) {
            return search(coord, resolution, parentScope);
        }));
        var invokeCallback = function (results) {
            callback(results);
        };
        if (promises.length === 0) {
            $log.debug(_tag + 'No layers were searched.');
            invokeCallback(_searchResults);
        } else {
            var processResults = function (response) {
                _searchResults.push(response);
                if (_searchResults.length === promises.length) {
                    $log.debug(_tag + 'All promises have returned. Passing results to caller.');
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
        $log.debug(_tag + 'Registering searchable.');
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

    $log.debug(_tag + 'Service started.');
}])
;
