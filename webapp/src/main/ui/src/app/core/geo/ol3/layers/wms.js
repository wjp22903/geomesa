angular.module('stealth.core.geo.ol3.layers')

.factory('stealth.core.geo.ol3.layers.WmsLayer', [
'$log',
'$timeout',
'stealth.core.geo.ol3.layers.MapLayer',
'CONFIG',
function ($log, $timeout, MapLayer, CONFIG) {
    var tag = 'stealth.core.geo.ol3.layers.WmsLayer: ';
    $log.debug(tag + 'factory started');
    var WmsLayer = function (name, requestParams, zIndexHint, wmsUrl) {
        var _self = this;
        var _isLoading = false;

        if (_.isUndefined(requestParams.BUFFER)) {
            requestParams.BUFFER = 5; // pixels
        }

        var _olSource = new ol.source.ImageWMS({
            url: wmsUrl || (CONFIG.geoserver.defaultUrl + '/wms'),
            params: requestParams,
            imageLoadFunction: function (image, src) {
                $timeout(function () {
                    _isLoading = true;
                    _self.styleDirectiveScope.$emit(_self.id + ':isLoading');

                    image.listenOnce(goog.events.EventType.CHANGE, function (evt) {
                        _self.styleDirectiveScope.$evalAsync(function () {
                            _isLoading = false;
                            _self.styleDirectiveScope.$emit(_self.id + ':finishedLoading');
                        });
                    });

                    ol.source.Image.defaultImageLoadFunction.call(this, image, src);
                });
            }
        });

        var _olLayer = new ol.layer.Image({
            source: _olSource
        });

        $log.debug(tag + 'new WmsLayer(' + arguments[0] + ')');
        MapLayer.apply(this, [name, _olLayer, zIndexHint]);
    };
    WmsLayer.prototype = Object.create(MapLayer.prototype);

    return WmsLayer;
}])

;