angular.module('stealth.common.control.leaflet.layersLegendControl', [
    'colorpicker.module',
    'stealth.common.forms.managers',
    'stealth.common.layermanager.leaflet.layerManager',
    'stealth.common.utils',
    'ui.bootstrap'
])

.factory('LayersLegendControlFactory', [
    '$rootScope', '$compile', '$templateCache',
    function ($rootScope, $compile, $templateCache) {

        var LayersLegendControl = L.Control.extend({
            options: {
                collapsed: false,
                position: 'bottomleft',
                autoZIndex: true
            },

            initialize: function (options) {
                L.setOptions(this, options);
            },

            onAdd: function (map) {
                this._initLayout(map);
                return this._container;
            },

            onRemove: function (map) {

            },

            _initLayout: function (map) {
                var className = 'leaflet-control-layers leaflet-control-layers-expanded air-tracker-control air-tracker-layers-control layers-legend-control-expanded';
                this._container = L.DomUtil.create('div', className);
                var ngContainer = angular.element(this._container);
                ngContainer.attr('aria-haspopup', 'true');
                var layersLegendElement = angular.element($templateCache.get('common/control/leaflet/layersLegendControl.tpl.html'));
                ngContainer.append($compile(layersLegendElement)($rootScope.$new()));
            }

        });

        var _createControl = function (options) {
            return new LayersLegendControl(options);
        };

        return {
            createControl: _createControl
        };
    }
])

.controller('LayersLegendControlController', [
    '$rootScope', '$scope', '$modal', '$timeout', 'LayerManager', 'QueryFormManager',
    function ($rootScope, $scope, $modal, $timeout, LayerManager, QueryFormManager) {

        $scope.layers = LayerManager.orderedLayers;
        $scope.pending = LayerManager.pendingLayersMap;
        $scope.failed = LayerManager.failedLayersMap;

        $scope.toggleTags = function (layer) {
            if (!layer.style.colorById) {
                layer.tagsStyle['background-color'] = 'aqua';
                layer.style.colorById = true;
            }
            else {
                layer.tagsStyle['background-color'] = 'white';
                layer.style.colorById = false;
            }
            $rootScope.$emit('Redraw Layers');
        };

        $scope.showPending = function () {
            return (Object.keys($scope.pending).length > 0 || Object.keys($scope.failed).length > 0);
        };

        $scope.showSeparator = function () {
            return (Object.keys($scope.layers).length > 0 && Object.keys($scope.pending).length > 0 ||
                    Object.keys($scope.layers).length > 0 && Object.keys($scope.failed).length >0);
        };

        $scope.increaseWeight = function (layer) {
            if (layer.style.weight < 99) {
                layer.style.weight += 1;
                $rootScope.$emit('Redraw Layers');
            }
        };

        $scope.decreaseWeight = function (layer) {
            if (layer.style.weight > 1) {
                layer.style.weight -= 1;
                $rootScope.$emit('Redraw Layers');
            }
        };

        $scope.updateDrawColor = function (layer) {
            layer.style.color = layer.style['background-color'];
            $rootScope.$emit('Redraw Layers');
        };

        $scope.destroyLayer = function (id) {
            LayerManager.destroyActiveLayer(id);
        };

        $scope.removeFail = function (id) {
            LayerManager.destroyFailedLayer(id);
        };

        $scope.toggleShowError = function (id) {
            $scope.failed[id].showError = !$scope.failed[id].showError;
        };

        $scope.openQueryForm = function () {
            var templateUrl = 'common/forms/playbackQueryForm.tpl.html';
            $modal.open({
                templateUrl: templateUrl,
                scope: $scope, // parent scope of $modal scope
                controller: function ($scope, $modalInstance) {

                    $scope.modal = {
                        cancel: function () {
                            $modalInstance.dismiss('cancel');
                        },
                        submit: function () {
                            $modalInstance.dismiss('cancel');
                            $scope.query.addLayer();
                        }
                    };
                },
                backdrop: 'static'  // prevents close when clicking
                                    // outside of $modal window
            });
        };

        $scope.query = QueryFormManager.getQueryData('playback');
        $scope.query.formStep = function () {
            var step = 1; // Show the server url input
            if ($scope.query.serverData.currentGeoserverUrl &&
                !$scope.query.serverData.error &&
                $scope.query.layerData &&
                $scope.query.layerData.layers) {

                step = 2; // Show the layer select input.
                if ($scope.query.layerData.currentLayer &&
                    !$scope.query.layerData.error &&
                        $scope.query.featureTypeData) {

                    step = 3; // Show the layer details and cql query input
                    if ($scope.query.layerData.currentLayerFriendlyName) {
                        step = 4;

                        if ($scope.query.params.idField &&
                            $scope.query.params.minLon &&
                            $scope.query.params.minLat &&
                            $scope.query.params.maxLon &&
                            $scope.query.params.maxLat &&
                            $scope.query.params.startDate &&
                            $scope.query.params.startTime &&
                            $scope.query.params.endDate &&
                            $scope.query.params.endTime) {

                            step = 5;
                        }
                    }
                }
            }
            return step;
        };

        $scope.query.useMapExtent = function () {
            $rootScope.$emit('get leaflet map bounds', function (bounds) {
                $scope.query.params.minLon = bounds.west;
                $scope.query.params.minLat = bounds.south;
                $scope.query.params.maxLon = bounds.east;
                $scope.query.params.maxLat = bounds.north;
            });
        };
        $scope.query.addLayer = function () {
            function buildCqlFilter(query) {
                var cql_filter =
                    'BBOX(geom,' +
                    query.params.minLat + ',' +
                    query.params.minLon + ',' +
                    query.params.maxLat + ',' +
                    query.params.maxLon + ')' +
                    ' AND ' + 'dtg DURING ' +
                    moment(query.params.startDate).format('YYYY-MM-DD') + 'T' +
                    moment(query.params.startTime).format('HH:mm') + ':00.000Z' +
                    '/' +
                    moment(query.params.endDate).format('YYYY-MM-DD') + 'T' +
                    moment(query.params.endTime).format('HH:mm') + ':00.000Z ';

                if ($scope.query.cql) {
                    cql_filter += ' AND ' + $scope.query.cql;
                }

                return cql_filter;
            }

            var copy = QueryFormManager.copyQueryData('playback');
            LayerManager.loadPlaybackQuery({
                url: copy.serverData.currentGeoserverUrl + '/' + copy.layerData.currentLayer.prefix,
                layerFriendlyName: copy.layerData.currentLayerFriendlyName,
                typeName: copy.layerData.currentLayer.name,
                responseType: 'arraybuffer',
                overrides: {
                    sortBy: 'dtg',
                    propertyName: 'dtg,geom,' + copy.params.idField.name,
                    outputFormat: 'application/vnd.binary-viewer',
                    format_options: 'dtg:dtg;trackId:' + copy.params.idField.name,
                    cql_filter: buildCqlFilter(copy)
                }
            });
        };

        $scope.uploadFile = function () {
            $timeout(function () {
                var e = document.getElementById('upfile');
                e.value = null;
                e.click();
            }, 1, true);
        };

        $scope.fileSelected = function (element) {
            var file = element.files[0];
            LayerManager.loadPlaybackFile(file);
        };
    }
]);
