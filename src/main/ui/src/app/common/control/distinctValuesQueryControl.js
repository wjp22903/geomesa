angular.module('stealth.common.control.distinctValuesQueryInfo', [
    'stealth.ows.distinctValuesQuery',
    'ui.bootstrap'
])

.controller('DistinctValuesQueryController', [ '$scope', '$rootScope', '$modal', 'CONFIG', 'WFS', 'DistinctValuesQuery',
    function($scope, $rootScope, $modal, CONFIG, WFS, DistinctValuesQuery) {

    $scope.distinctValuesQuery = {
        values: {
            layer: CONFIG.airTracker.data.layer,
            attribute: null,
            filter: "INCLUDE",
            results: null
        },
        options: [],
        error: '',
        showSpinner: false
    };

    $scope.distinctValuesQuery.showWindow = function () {
        $scope.distinctValuesQuery.error = '';
        $scope.distinctValuesQuery.fetchAttributes();
        $modal.open({
            scope: $scope,
            backdrop: 'static',
            templateUrl: 'common/control/distinctValuesQuery.tpl.html',
            controller: function ($scope, $modalInstance) {
                $scope.$parent.distinctValuesQuery.modal = {
                    close: function () {
                        $modalInstance.dismiss('cancel');
                    }
                };
            }
        });
    };

    $scope.distinctValuesQuery.setInitialQuery = function() {
        // try to find an attribute that is a geometry type (namespace is 'gml')
        var geom = _.find($scope.distinctValuesQuery.options,
            function (attr) { return attr.type.lastIndexOf('gml', 0) === 0; });
        if (_.isUndefined(geom)) {
            $scope.distinctValuesQuery.values.filter = "INCLUDE";
        } else {
            var bounds = $scope.map.getBounds();
            $scope.distinctValuesQuery.values.filter = 'BBOX(' + geom.name + ', ' + bounds.getWest() +
                ', ' + bounds.getSouth() + ', ' + bounds.getEast() + ', ' + bounds.getNorth() + ')';
        }
    };

    $scope.distinctValuesQuery.fetchAttributes = function() {
        if (_.isEmpty($scope.distinctValuesQuery.options)) {
            $scope.distinctValuesQuery.showSpinner = true;
            WFS.getFeatureTypeDescription(CONFIG.geoserver.defaultUrl, $scope.distinctValuesQuery.values.layer, CONFIG.geoserver.omitProxy)
                .then(function (data) {
                    if (data.error) {
                        // Response is successful, but no description is found for the type.
                        $scope.distinctValuesQuery.error = 'Could not determine feature attributes.';
                    } else {
                        var values = _.chain(data.featureTypes[0].properties)
                            .map(function (prop) { return { name: prop.name, type: prop.type, typeLabel: prop.localType }; })
                            .sortBy(function (prop) { return prop.name; })
                            .value();
                        $scope.distinctValuesQuery.options = values;
                        $scope.distinctValuesQuery.setInitialQuery();
                    }
                }, function (reason) {
                   $scope.distinctValuesQuery.error = 'Could not determine feature attributes. Error: ' +
                        reason.status + ' ' + reason.statusText;
                })["finally"](function () {
                   $scope.distinctValuesQuery.showSpinner = false;
                });
        } else {
            // reset the query based on current zoom
            $scope.distinctValuesQuery.setInitialQuery();
        }
    };

    $scope.distinctValuesQuery.submit = function () {
        $scope.distinctValuesQuery.showSpinner = true;
        var values = $scope.distinctValuesQuery.values;
        DistinctValuesQuery.initiateQuery(values.layer, values.attribute.name, values.filter);
    };

    $scope.distinctValuesQuery.results = function (results) {
        $scope.distinctValuesQuery.showSpinner = false;
        if (_.isArray(results)) {
            $scope.distinctValuesQuery.modal.close();
            $scope.distinctValuesQuery.values.attributes = results;
            $modal.open({
                scope: $scope,
                backdrop: 'static',
                templateUrl: 'common/control/distinctValuesResults.tpl.html'
            });
        } else {
            // error
            $scope.distinctValuesQuery.error = results;
        }
    };

    // Action for distinct values query:
    $rootScope.$on('distinct values result',
        function (evt, collection) {
            $scope.distinctValuesQuery.results(collection);
        }
    );
}])

.factory('DistinctValuesQueryLeaflet', ['$injector', function ($injector) {

    // Custom control that displays info about track and provides
    // a way to query the history of the selected track.
    var DistinctValuesQueryLeaflet = L.Control.extend({
        options: {
            position: 'topright',
            autoZIndex: true
        },

        initialize: function (options) {
            L.setOptions(this, options);
            this._values = [];
        },

        onAdd: function (map) {
            this._initLayout();
            return this._container;
        },

        _initLayout: function () {
            var className = 'distinct-values-query-control';
            this._container = L.DomUtil.create('div', className + "-outer");

            this._controller = L.DomUtil.create('div', className, this._container);
            this._controller.innerHTML = '<h4>Distinct Values</h4>';
            this._controller.setAttribute('ng-controller', 'DistinctValuesQueryController');

            this._button = L.DomUtil.create('button',
                                            className + '-button' + ' ' +
                                            'btn btn-primary',
                                            this._controller);
            this._button.innerHTML = 'Query';
            this._button.setAttribute('ng-click', 'distinctValuesQuery.showWindow()');
        },

        // bootstrap the angular elements after they've been added dynamically by leaflet
        // has to be called after the control is added to the map
        injectNg: function () {
            var element = angular.element(this._container);
            var compileFn = function($compile) {
                var scope = element.scope();
                $compile(element)(scope);
            };
            $injector.invoke(compileFn);
        }
    });

    var createControl = function () {
        return new DistinctValuesQueryLeaflet();
    };

    return {
        createControl: createControl
    };
}])
;
