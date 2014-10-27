angular.module('stealth.common.layermanager.leaflet.layerManager', [
    'stealth.common.store.binaryDataStore',
    'stealth.common.utils',
    'stealth.ows.ows'
])

.service('LayerManager', [
    '$rootScope', 'CONFIG', 'DataStore', 'WFS', 'Utils',
    function($rootScope, CONFIG, DataStore, WFS, Utils) {

        // Private Members
        var self = this,
            fileReader = new FileReader(),
            currentFileName = "blank",
            nextId = 0;

        fileReader.onload = function (e) {
            $rootScope.$apply(function() {
                _activateLayer(_generateId(), fileReader.result, currentFileName);
            });
        };

        // Public Members
        this.activeLayersMap = {};
        this.pendingLayersMap = {};
        this.failedLayersMap = {};
        this.orderedLayers = [];

        // Private Methods
        function _generateId () {
            return nextId++;
        }

        function _activateLayer(layerId, arrayBuffer, layerLabel) {
            var dataStore = DataStore.createStore(arrayBuffer);
            var iColor = layerId % 6;

            self.activeLayersMap[layerId] = {
                id: layerId,
                store: dataStore,
                label: layerLabel,
                style: {
                    'background-color': Utils.webSafeColors[iColor],
                    color: Utils.webSafeColors[iColor],
                    weight: 3,
                    zIndex: self.orderedLayers.length,
                    isSelected: true,
                    colorById: false
                },
                tagsStyle: {
                    'background-color': 'white'
                }
            };

            self.orderedLayers.push(self.activeLayersMap[layerId]);
            if (layerId in self.pendingLayersMap) {
                delete self.pendingLayersMap[layerId];
            }

            $rootScope.$emit('New Playback Layer', dataStore.minTimestamp, dataStore.maxTimestamp);
            $rootScope.$emit('Redraw Layers');
        }

        function _failLayer(layerId, status) {
            if (layerId in self.pendingLayersMap) {
                var failedLayer = self.pendingLayersMap[layerId];
                failedLayer.status = status;
                failedLayer.showError = false;
                self.failedLayersMap[layerId] = failedLayer;
                delete self.pendingLayersMap[layerId];
            }
        }

        // Public Methods
        this.loadPlaybackFile = function (file) {
            console.debug('(LayerManager) New playback file received: ' + file.name);
            currentFileName = file.name;
            fileReader.readAsArrayBuffer(file);
        };

        this.loadPlaybackQuery = function (params) { //$rootScope.$on('new playback query', function (event, params) {
            var layerId = _generateId();
            var layerLabel = params.layerFriendlyName;

            WFS.getFeature(params.url,
                           params.typeName,
                           params.overrides,
                           params.responseType,
                           CONFIG.geoserver.omitProxy).success(success).error(failed);

            function success(data, status, headers, config, statusText) {
                var contentType = headers('content-type');
                if (contentType.indexOf("xml") > -1) {
                    _failLayer(layerId, 'Malformed query');
                } else {
                    // 'data' expected to be of type ArrayBuffer
                    if (data.byteLength === 0) {
                        _failLayer(layerId, 'No results');
                    }
                    else {
                        _activateLayer(layerId, data, layerLabel);
                    }
                }
            }

            function failed(data, status) {
                _failLayer(layerId, status);
            }

            this.pendingLayersMap[layerId] = {
                id: layerId,
                label: layerLabel
            };
        };

        this.destroyActiveLayer = function (id) { // $rootScope.$on('destroy layer', function (e, deletedLayer) {
            if (id in this.activeLayersMap) {
                var layerToDelete = this.activeLayersMap[id];
                delete this.activeLayersMap[layerToDelete.id];

                if (this.orderedLayers[layerToDelete.style.zIndex].id === layerToDelete.id) {
                    this.orderedLayers.splice(layerToDelete.style.zIndex, 1);
                } else {
                    var layerIndex = _.findIndex(this.orderedLayers, function(layer) {
                        return layer.id === id;
                    });
                    this.orderedLayers.splice(layerIndex, 1);
                }
                angular.forEach(this.orderedLayers, function(layer, index) {
                    layer.style.zIndex = index;
                });


                if (this.orderedLayers.length === 0) {
                    $rootScope.$emit('Close Playback');
                    $rootScope.$emit('Redraw Layers');
                } else {
                    var minTimestamp = this.orderedLayers[0].store.minTimestamp;
                    var maxTimestamp = this.orderedLayers[0].store.maxTimestamp;
                    angular.forEach(this.orderedLayers, function(layer, index) {
                        minTimestamp = Math.min(minTimestamp, layer.store.minTimestamp);
                        maxTimestamp = Math.max(maxTimestamp, layer.store.maxTimestamp);
                    });
                    $rootScope.$emit('Reset Playback Time', minTimestamp, maxTimestamp);
                }
            }
        };

        this.destroyFailedLayer = function (id) {
            if (id in this.failedLayersMap) {
                delete this.failedLayersMap[id];
            }
        };

        this.drawLayers = function (curTimestamp, curFollowMin, callback) {
            var curFollowMillis = curFollowMin * 60 * 1000;
            angular.forEach(this.orderedLayers, function(layer, index) {
                if (layer.style.isSelected) {
                    var begIdx = layer.store.lowerBound(curTimestamp - curFollowMillis);
                    var endIdx = layer.store.upperBound(curTimestamp);
                    callback(layer, begIdx, endIdx);
                }
            });
        };
    }
]);
