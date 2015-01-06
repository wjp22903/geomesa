angular.module('stealth.timelapse.geo.ol3.layers', [
    'stealth.core.geo.ol3.layers'
])

.factory('stealth.timelapse.geo.ol3.layers.PollingWmsLayer', [
'$log',
'$interval',
'stealth.core.geo.ol3.layers.WmsLayer',
function ($log, $interval, WmsLayer) {
    var tag = 'stealth.timelapse.geo.ol3.layers.PollingWmsLayer: ';
    $log.debug(tag + 'factory started');

    var PollingWmsLayer = function (name, requestParams, preload, zIndexHint) {
        var _self = this;
        var _pollingInterval = 3600000;
        var _clearCacheWhenFinished = false;
        var _params = angular.copy(requestParams);

        var _refresh = function () {
            if (_self.getOl3Layer().getVisible()) {
                $log.debug(tag + name + ': refresh layer');
                var isLoadingTiles = !_.isNull(_self.loading);
                if (isLoadingTiles) {
                    // If the layer is still loading tiles,
                    // then clear the tile cache after it
                    // is finished loading.
                    _clearCacheWhenFinished = true;
                } else {
                    // Otherwise, clear the cache right now.
                    _self.clearTileCache();
                    _clearCacheWhenFinished = false;
                }
            }
        };

        var polling = startPolling(_pollingInterval, _refresh);

        this.setPollingInterval = function (interval) {
            _pollingInterval = interval;
            $log.debug(tag + 'setPollingInterval(' + _pollingInterval + ')');
            if (_pollingInterval < 1) {
                // If the refresh value is 0, cancel polling.
                if (!_.isNull(polling)) {
                    $interval.cancel(polling);
                    polling = null;
                }
            } else {
                // Otherwise, start a new polling routine with the new interval.
                if (_.isNull(polling)) {
                    polling = startPolling(_pollingInterval, _refresh);
                    _refresh();
                } else {
                    $interval.cancel(polling);
                    polling = startPolling(_pollingInterval, _refresh);
                    _refresh();
                }
            }
        };

        $log.debug(tag + 'new PollingWmsLayer(' + name + ')');
        WmsLayer.apply(this, arguments);

        this.styleDirectiveScope.$on(name + ':finishedLoading', function (e) {
            $log.debug(tag + name + ': finished loading');

            // If the layer has been asked to refresh, but was still loading tiles,
            // then clear the cache when finished loading the current tiles.
            if (_clearCacheWhenFinished) {
                _self.clearTileCache();
                _clearCacheWhenFinished = false;
            }
        });

        this.refresh = _refresh;
    };
    PollingWmsLayer.prototype = Object.create(WmsLayer.prototype);

    function startPolling (pollingInterval, callback) {
        var promise = $interval(function () {
            callback();
        }, pollingInterval);
        return promise;
    }

    return PollingWmsLayer;
}])

;