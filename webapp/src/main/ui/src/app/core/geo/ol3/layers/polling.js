angular.module('stealth.core.geo.ol3.layers')

.factory('stealth.core.geo.ol3.layers.PollingImageWmsLayer', [
'$log',
'$interval',
'stealth.core.geo.ol3.layers.WmsLayer',
function ($log, $interval, WmsLayer) {
    var tag = 'stealth.core.geo.ol3.layers.PollingImageWmsLayer: ';
    $log.debug(tag + 'factory started');
    var PollingImageWmsLayer = function (name, requestParams, queryable, zIndexHint, wmsUrl) {
        var _self = this;
        var _pollingInterval = 3600000;
        var _params = requestParams;
        var _refreshAfterLoad = false;

        $log.debug(tag + 'new PollingImageWmsLayer(' + arguments[0] + ')');
        WmsLayer.apply(_self, [name, requestParams, queryable, 1, zIndexHint, wmsUrl, function () {
            if (_refreshAfterLoad) {
                _refreshAfterLoad = false;
                _self.refresh();
            }
        }]);

        _self.refresh = function (requestParams) {
            _params = requestParams || _params;
            if (_self.isLoading()) {
                _refreshAfterLoad = true;
            } else if (_self.getOl3Layer().getVisible()) {
                $log.debug(tag + name + ': refresh layer');
                _self.updateRequestParams(_params);
            }
        };

        _self.cancelPolling = function () {
            if (!_.isNull(polling)) {
                $log.debug(tag + name + ': polling canceled');
                $interval.cancel(polling);
                polling = null;
            }
        };

        _self.setPollingInterval = function (interval) {
            _pollingInterval = interval;
            $log.debug(tag + name + ': setPollingInterval(' + _pollingInterval + ')');
            if (_pollingInterval < 1) {
                // If the refresh value is 0, cancel polling.
                _self.cancelPolling();
            } else {
                // Otherwise, start a new polling routine with the new interval.
                if (_.isNull(polling)) {
                    polling = startPolling(_pollingInterval, _self.refresh);
                    _self.refresh();
                } else {
                    $interval.cancel(polling);
                    polling = startPolling(_pollingInterval, _self.refresh);
                    _self.refresh();
                }
            }
        };

        var _mapListenerKey = null;
        _self.setRefreshOnMapChange = function (ol3Map) {
            _mapListenerKey = ol3Map.on('moveend', function () {
                _self.refresh();
            });
        };
        _self.removeRefreshOnMapChange = function (ol3Map) {
            ol3Map.unByKey(_mapListenerKey);
        };

        var polling = startPolling(_pollingInterval, _self.refresh);

        var searchPoint = this.searchPoint;
        this.searchPoint = function (coord, res) {
            return searchPoint.call(this, coord, res, {
                BUFFER: 5 //more generous search radius because live layer moves
            });
        };
    };
    PollingImageWmsLayer.prototype = Object.create(WmsLayer.prototype);

    function startPolling (pollingInterval, callback) {
        var promise = $interval(function () {
            callback();
        }, pollingInterval);
        return promise;
    }

    return PollingImageWmsLayer;
}])

;
