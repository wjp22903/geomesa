angular.module('stealth.core.interaction.click', [
    'stealth.core.geo.ol3.map'
])

.service('mapClickService', [
'$log',
'$rootScope',
function ($log, $rootScope) {
    var tag = 'stealth.core.interaction.click: ';
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
'mapClickService',
'ol3Map',
function ($element, $filter, $scope, $rootScope, mapClickService, ol3Map) {
    var overlay = new ol.Overlay({
        element: $element,
        insertFirst: false
    });
    ol3Map.addOverlay(overlay);
    var mapSize = ol3Map.getSize();
    var isPinned = false;
    var id = parseInt($element.attr('popup-id'), 10);
    var _self = this;

    /**
     * Members available to the view.
     */
    this.showPopup = false;
    this.wizardActive = false;
    this.results = [];
    this.lat = parseFloat($element.attr('lat'));
    this.lon = parseFloat($element.attr('lon'));
    this.containerStyle = {
        height: 'auto',
        width: 'auto',
        'max-width': mapSize[0] * 0.6 + 'px',
        'max-height': mapSize[1] * 0.6 + 'px'
    };
    overlay.setPosition([_self.lon, _self.lat]);
    this.focus = function () {
        $element.css('z-index', '92');
        $rootScope.$emit('Popup Focus Change', id);
    };
    this.stopDrag = function (event) {
        event.stopPropagation();
    };
    this.removeRecord = function (result, record) {
        _.pull(result.records, record);

        if (result.records.length === 0) {
            this.removeResult(result);
            return;
        }

        var numPages = result.paging.numberOfPages();
        if (result.paging.currentPage > numPages) {
            result.paging.suggestedPage = result.paging.currentPage = numPages;
        }
    };
    this.removeResult = function (result) {
        _.pull(this.results, result);
        if (this.results.length === 0) {
            this.closePopup();
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
    this.isPinned = function () {
        return isPinned;
    };
    this.togglePin = function () {
        isPinned = !isPinned;
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
    this.formatValue = function (key, value, result) {
        if (result.fieldTypes) {
            var type = _.find(result.fieldTypes, {'name': key});
            if (type.localType) {
                switch (type.localType) {
                    case 'date-time':
                        return moment.utc(value).format('YYYY-MM-DD[T]HH:mm:ss[Z]');
                    case 'number':
                        return $filter('number')(value);
                    default:
                        return value;
                }
            }
        }
        return value;
    };

    mapClickService.search([this.lon, this.lat], ol3Map.getResolution(), function(responses) {
        _.forEach(responses, function (response) {
            if (!response.isError && response.records.length > 0) {
                //Filter out empty fields
                var empty = _.reject(_.keys(response.records[0]), function (key) {
                    return _.any(_.pluck(response.records, key), function (value) {
                        return !(_.isUndefined(value) || _.isNull(value) || (_.isString(value) && _.isEmpty(value.trim())));
                    });
                });
                response.records = _.map(response.records, function (record) {
                    return _.omit(record, empty);
                });

                response.paging = {
                    suggestedPage: 1,
                    currentPage: 1,
                    pageSize: 4,
                    checkSuggestedPage: function () {
                        if (response.paging.suggestedPage > 0 &&
                            response.paging.suggestedPage <= response.paging.numberOfPages()) {
                            response.paging.currentPage = response.paging.suggestedPage;
                        }
                    },
                    numberOfPages: function () {
                        var num = 0;
                        if (_.isArray(response.records)) {
                            num = Math.ceil(response.records.length/response.paging.pageSize);
                        }
                        return num;
                    }
                };
                _self.results.push(response);
            }
        });
        if (_self.results.length > 0) {
            _self.showPopup = true;
            $rootScope.$emit('Popup Focus Change', id);
        } else {
            _self.closePopup();
        }
    });

    var closeUnpinned = function (event) {
        if (!isPinned) {
            ol3Map.un('click', closeUnpinned);
            _self.closePopup();
        }
    };
    ol3Map.on('click', closeUnpinned);

    var unbind = $rootScope.$on('Popup Focus Change', function (event, popupId) {
        if (popupId !== id) {
            $element.css('z-index', '91');
        }
    });

    $scope.$on('$destroy', function () {
        unbind();
    });

    $rootScope.$on('wizard:launchWizard', function () {
        _self.wizardActive = true;
        ol3Map.un('click', closeUnpinned);
    });

    $rootScope.$on('wizard:closeWizard', function () {
        _self.wizardActive = false;
        ol3Map.on('click', closeUnpinned);
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
            element.parent().css('height', 0);
            element.draggable({
                stop: function (event, ui) {
                    scope.$apply(function () {
                        element.css('width', '');
                    });
                }
            });
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
'$rootScope',
'$compile',
'ol3Map',
function ($rootScope, $compile, ol3Map) {
    return {
        restrict: 'E',
        link: function (scope, element, attrs) {
            var _idSeq = 0;
            var buildFn = function (event) {
                scope.$evalAsync(function () {
                    var html = '<div st-ol3-map-popup lat="' + event.coordinate[1] + '" lon="' +
                        event.coordinate[0] + '" popup-id="' + (_idSeq++) + '" ' +
                        'style="z-index: 92"></div>';
                    var el = angular.element(html);
                    element.append(el);
                    $compile(el)(scope);
                });
            };
            ol3Map.on('click', buildFn);
            $rootScope.$on('wizard:launchWizard', function () {
                ol3Map.un('click', buildFn);
            });
            $rootScope.$on('wizard:closeWizard', function () {
                ol3Map.on('click', buildFn);
            });
        }
    };
}])
;
