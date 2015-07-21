angular.module('stealth.core.geo.ol3.layers')

.service('stealth.core.geo.ol3.layers.PollableLayer', [
'$log',
'$interval',
function ($log, $interval) {
    var tag = 'stealth.core.geo.ol3.layers.PollableLayer: ';
    $log.debug(tag + 'factory started');
    this.extending = function (layerFactory) {
        var PollableLayer = function (options) {
            var _self = this;
            var _pollingInterval = 30000;
            var _refreshAfterLoad = false;
            var _refreshListeners = [];
            var _polling = null;
            var _mapListenerKey = null;
            var _waitingParams;

            $log.debug(tag + 'new PollableLayer');
            layerFactory.call(_self, _.merge({
                onLoad: function () {
                    if (_refreshAfterLoad) {
                        _refreshAfterLoad = false;
                        _self.refresh(_waitingParams);
                    }
                }
            }, options));

            _self.refresh = function (requestParams) {
                requestParams = requestParams || {};
                if (_self.isLoading()) {
                    _waitingParams = requestParams;
                    _refreshAfterLoad = true;
                } else if (_self.getOl3Layer().getVisible()) {
                    $log.debug(tag + ': refresh layer');
                    _self.updateRequestParams(requestParams);
                    _.forEach(_refreshListeners, function (listener) {
                        listener(requestParams);
                    });
                }
            };

            _self.addRefreshListener = function (listener) {
                if (_.isFunction(listener)) {
                    _refreshListeners.push(listener);
                }
            };

            _self.removeRefreshListener = function (listener) {
                _.pull(_refreshListeners, listener);
            };

            _self.cancelPolling = function () {
                if (!_.isNull(_polling)) {
                    $log.debug(tag + ': polling canceled');
                    $interval.cancel(_polling);
                    _polling = null;
                }
            };

            _self.setPollingInterval = function (interval) {
                _pollingInterval = interval;
                $log.debug(tag + ': setPollingInterval(' + _pollingInterval + ')');
                if (_pollingInterval < 1) {
                    // If the refresh value is 0, cancel polling.
                    _self.cancelPolling();
                } else {
                    // Otherwise, start a new polling routine with the new interval.
                    _self.cancelPolling();
                    _polling = startPolling(_pollingInterval, _self.refresh);
                    _self.refresh();
                }
            };

            _self.setRefreshOnMapChange = function (ol3Map) {
                _mapListenerKey = ol3Map.on('moveend', function () {
                    _self.refresh();
                });
            };

            _self.removeRefreshOnMapChange = function (ol3Map) {
                ol3Map.unByKey(_mapListenerKey);
            };

            _polling = startPolling(_pollingInterval, _self.refresh);
        };
        PollableLayer.prototype = Object.create(layerFactory.prototype);

        function startPolling (pollingInterval, callback) {
            var promise = $interval(function () {
                callback();
            }, pollingInterval);
            return promise;
        }

        return PollableLayer;
    };
}])

.factory('stealth.core.geo.ol3.layers.PollingImageWmsLayer', [
'$log',
'stealth.core.geo.ol3.layers.PollableLayer',
'stealth.core.geo.ol3.layers.WmsLayer',
function ($log, PollableLayer, WmsLayer) {
    var pollingWmsLayer = PollableLayer.extending(WmsLayer);
    var tag = 'stealth.core.geo.ol3.layers.PollingImageWmsLayer: ';
    $log.debug(tag + 'factory started');
    var PollingImageWmsLayer = function (options) {
        $log.debug(tag + 'new PollingImageWmsLayer(' + arguments[0] + ')');
        pollingWmsLayer.call(this, options);
    };
    PollingImageWmsLayer.prototype = Object.create(pollingWmsLayer.prototype);

    return PollingImageWmsLayer;
}])

.factory('stealth.core.geo.ol3.layers.PollingGeoJsonVectorLayer', [
'$log',
'stealth.core.geo.ol3.layers.PollableLayer',
'stealth.core.geo.ol3.layers.GeoJsonVectorLayer',
function ($log, PollableLayer, GeoJsonVectorLayer) {
    var pollingGeoJsonVectorLayer = PollableLayer.extending(GeoJsonVectorLayer);
    var tag = 'stealth.core.geo.ol3.layers.PollingGeoJsonVectorLayer: ';
    $log.debug(tag + 'factory started');
    var PollingGeoJsonVectorLayer = function (options) {
        $log.debug(tag + 'new PollingGeoJsonVectorLayer(' + arguments[0] + ')');
        pollingGeoJsonVectorLayer.call(this, options);
    };
    PollingGeoJsonVectorLayer.prototype = Object.create(pollingGeoJsonVectorLayer.prototype);

    return PollingGeoJsonVectorLayer;
}])

;
