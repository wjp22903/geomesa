angular.module('stealth.core.interaction.mapclick', [
    'ccri.popup',
    'stealth.core.geo.ol3.map',
    'stealth.core.popup',
    'stealth.core.utils'
])

.run([
'$filter',
'$rootScope',
'ol3Map',
'stealth.core.interaction.mapclick.searchManager',
'ccri.popup.manager',
'ccri.angular-utils.WidgetDef',
function ($filter, $rootScope, ol3Map, searchManager, popupManager, WidgetDef) {
    var _element = angular.element('<div class="fa fa-fw fa-spinner fa-spin fa-lg mapSearchSpinner"></div>');
    var _popupContainer = angular.element('.primaryDisplay > ccri-popup-container');
    var _popupContainerId;
    var _getPositioning = function (eventPixels) {
        var viewportDim = popupManager.getViewportDim(_popupContainerId);
        var center = [viewportDim[0] / 2, viewportDim[1] / 2];
        if (eventPixels[0] < center[0]) {
            if (eventPixels[1] < center[1]) {
                return Popup.Positioning['TopLeft'];
            } else {
                return Popup.Positioning['BottomLeft'];
            }
        } else if (eventPixels[1] < center[1]) {
            return Popup.Positioning['TopRight'];
        } else {
            return Popup.Positioning['BottomRight'];
        }
    };
    var _clickListener = function (event) {
        $rootScope.$evalAsync(function () {
            var overlay = new ol.Overlay({
                element: _element,
                position: event.coordinate
            });
            if (_.isUndefined(_popupContainerId)) {
                _popupContainerId = _popupContainer.data('ccri.popup.containerId');
            }
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
                    var contentDef = new WidgetDef({
                        tag: 'ccri-popup-components-tab-container',
                        scope: popupScope
                    });
                    var eventPixels = ol3Map.getEventPixel(event.originalEvent);
                    var buttonScope = $rootScope.$new();
                    buttonScope.iconClass = 'fa-thumb-tack';
                    buttonScope.extraClasses = function () {
                        return {active: popupScope.isPinned};
                    };
                    buttonScope.onClick = function () {
                        popupScope.isPinned = !popupScope.isPinned;
                    };
                    popupScope.popupId = popupManager.displayPopup(_popupContainerId, title, 'search', 'fa-search', contentDef, {
                        offsets: eventPixels,
                        positioning: _getPositioning(eventPixels),
                        toolDefs: [new WidgetDef({
                            tag: 'ccri-popup-tooldefs-button',
                            scope: buttonScope
                        })],
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
