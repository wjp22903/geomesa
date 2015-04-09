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

        if (_.isUndefined(requestParams.VERSION)) {
            requestParams.VERSION = '1.1.1';
        }

        var _olSource = new ol.source.ImageWMS({
            url: wmsUrl || (CONFIG.geoserver.defaultUrl + '/wms'),
            params: requestParams
        });

        _olSource.on('imageloadstart', function () {
            _self.styleDirectiveScope.$evalAsync(function () {
                _isLoading = true;
                _self.styleDirectiveScope.$emit(_self.id + ':isLoading');
            });
        });

        _olSource.on(['imageloadend', 'imageloaderror'], function () {
            _self.styleDirectiveScope.$evalAsync(function () {
                _isLoading = false;
                _self.styleDirectiveScope.$emit(_self.id + ':finishedLoading');
            });
        });

        var _olLayer = new ol.layer.Image({
            source: _olSource
        });

        $log.debug(tag + 'new WmsLayer(' + arguments[0] + ')');
        MapLayer.apply(this, [name, _olLayer, zIndexHint]);

        _self.updateRequestParams = function (params) {
            params.unique = _.now();
            _olSource.updateParams(params);
        };

        this.applyCql = function (cql) {
            this.updateRequestParams({
                CQL_FILTER: (_.isEmpty(cql) || _.isEmpty(cql.trim())) ? null : cql
            });
        };
     };
    WmsLayer.prototype = Object.create(MapLayer.prototype);

    return WmsLayer;
}])

;
