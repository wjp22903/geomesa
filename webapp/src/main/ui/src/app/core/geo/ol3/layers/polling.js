angular.module('stealth.core.geo.ol3.layers')

.service('pollingManager', [
'$log',
'$interval',
function ($log, $interval) {
    var _pollingInterval = 10000;
    var _polling = null;
    var _pollingListeners = [];
    var _onPoll = function () {
        _.each(_pollingListeners, function (listener) {
            listener();
        });
    };
    var _stopPolling = function () {
        if (!_.isNull(_polling)) {
            $log.debug(tag + ': polling stopping');
            $interval.cancel(_polling);
            _polling = null;
        }
    };
    var _startPolling = function (pollingInterval) {
        _polling = $interval(function () { _onPoll(); }, pollingInterval);
    };
    var tag = 'stealth.core.geo.ol3.layers.pollingManager: ';
    $log.debug(tag + 'service created.');

    this.addPollingListener = function (listener) {
        if (_.indexOf(_pollingListeners, listener) === -1 && _.isFunction(listener)) {
            _pollingListeners.push(listener);
        }
    };

    this.removePollingListener = function (listener) {
        _.pull(_pollingListeners, listener);
    };

    this.setPollingInterval = function (interval) {
        if (_pollingInterval !== interval) {
            _pollingInterval = interval;
            $log.debug(tag + ': setPollingInterval(' + _pollingInterval + ')');
            if (_pollingInterval < 1) {
                // If the refresh value is 0, cancel polling.
                _stopPolling();
            } else {
                // Otherwise, start a new polling routine with the new interval.
                _stopPolling();
                _startPolling(_pollingInterval);
                _onPoll();
            }
        }
    };

    _startPolling(_pollingInterval);
}])

.service('stealth.core.geo.ol3.layers.PollableLayer', [
'$log',
'pollingManager',
function ($log, pollingManager) {
    var tag = 'stealth.core.geo.ol3.layers.PollableLayer: ';
    $log.debug(tag + 'factory started');

    this.extending = function (layerFactory) {
        var PollableLayer = function (options) {
            var _self = this;
            var _options = options || {};
            var _refreshAfterLoad = false;
            var _refreshListeners = [];
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

            _self.startPolling = function () {
                pollingManager.addPollingListener(_self.refresh);
            };

            _self.cancelPolling = function () {
                pollingManager.removePollingListener(_self.refresh);
            };

            _self.setRefreshOnMapChange = function (ol3Map) {
                _mapListenerKey = ol3Map.on('moveend', function () {
                    _self.refresh();
                });
            };

            _self.removeRefreshOnMapChange = function (ol3Map) {
                ol3Map.unByKey(_mapListenerKey);
            };

            if (!options.preventInitialPolling) {
                pollingManager.addPollingListener(_self.refresh);
            }
        };
        PollableLayer.prototype = Object.create(layerFactory.prototype);

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
