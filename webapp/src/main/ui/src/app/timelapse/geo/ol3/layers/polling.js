angular.module('stealth.timelapse.geo.ol3.layers', [
    'stealth.core.geo.ol3.layers'
])

.factory('stealth.timelapse.geo.ol3.layers.PollingImageWmsLayer', [
'$log',
'$interval',
'$timeout',
'stealth.core.geo.ol3.layers.MapLayer',
'CONFIG',
function ($log, $interval, $timeout, MapLayer, CONFIG) {
    var tag = 'stealth.timelapse.geo.ol3.layers.PollingImageWmsLayer: ';
    $log.debug(tag + 'factory started');
    var PollingImageWmsLayer = function (name, requestParams, zIndexHint) {
        var _self = this;
        var _pollingInterval = 3600000;
        var _params = requestParams;
        var _loading = false;
        var _refreshAfterLoad = false;

        var _olSource = new ol.source.ImageWMS({
            url: CONFIG.geoserver.defaultUrl + '/wms',
            params: requestParams,
            imageLoadFunction: function (image, src) {
                $timeout(function () {
                    _loading = true;
                    _self.styleDirectiveScope.$emit(_self.id + ':isLoading');
                    image.listenOnce(goog.events.EventType.CHANGE, function (evt) {
                        $timeout(function () {
                            _loading = false;
                            _self.styleDirectiveScope.$emit(_self.id + ':finishedLoading');
                            if (_refreshAfterLoad) {
                                _refreshAfterLoad = false;
                                _self.refresh();
                            }
                        });
                    });
                    ol.source.Image.defaultImageLoadFunction.call(this, image, src);
                });
            }
        });

        var _olLayer = new ol.layer.Image({
            source: _olSource
        });

        $log.debug(tag + 'new PollingImageWmsLayer(' + arguments[0] + ')');
        MapLayer.apply(_self, [name, _olLayer, zIndexHint]);

        _self.refresh = function (requestParams) {
            _params = requestParams || _params;
            _params.unique = _.now();
            if (_loading) {
                _refreshAfterLoad = true;
            } else if (_self.getOl3Layer().getVisible()) {
                $log.debug(tag + name + ': refresh layer');
                _olSource.updateParams(_params);
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
            _mapListenerKey = ol3Map.on('moveend', _self.refresh);
        };
        _self.removeRefreshOnMapChange = function (ol3Map) {
            ol3Map.unByKey(_mapListenerKey);
        };

        var polling = startPolling(_pollingInterval, _self.refresh);
    };
    PollingImageWmsLayer.prototype = Object.create(MapLayer.prototype);

    function startPolling (pollingInterval, callback) {
        var promise = $interval(function () {
            callback();
        }, pollingInterval);
        return promise;
    }

    return PollingImageWmsLayer;
}])

;