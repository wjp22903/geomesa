angular.module('stealth.core.geo.ol3.layers')

.factory('stealth.core.geo.ol3.layers.WmsLayer', [
'$log',
'$interval',
'stealth.core.geo.ol3.layers.MapLayer',
'CONFIG',
function ($log, $interval, MapLayer, CONFIG) {
    var tag = 'stealth.core.geo.ol3.layers.WmsLayer: ';
    $log.debug(tag + 'factory started');
    var WmsLayer = function (name, requestParams, preload, zIndexHint) {
        var _self = this;
        var _tiles = [];
        _self.loading = null;

        var _olSource = new ol.source.TileWMS({
            url: CONFIG.geoserver.defaultUrl + '/wms',
            params: requestParams,
            tileLoadFunction: function (imageTile, src) {
                imageTile.getImage().src = src;

                //  Cache image tiles.
                _tiles.push(imageTile);

                // Poll the tiles cache for the loading state of each tile.
                if (_.isNull(_self.loading)){
                    _self.loading = pollTilesState(_self.id, _tiles, _self.styleDirectiveScope);
                }
            }
        });

        var _olLayer = new ol.layer.Tile({
            preload: preload || 0,
            source: _olSource
        });

        $log.debug(tag + 'new WmsLayer(' + arguments[0] + ')');
        MapLayer.apply(this, [name, _olLayer, zIndexHint]);

        this.styleDirectiveScope.$on(name + ':finishedLoading', function (e) {
            $log.debug(tag + name + ': finished loading');

            // Stop polling for tiles state.
            $interval.cancel(_self.loading);
            _self.loading = null;
            _tiles = [];
            _tiles.length = 0;
        });

    };
    WmsLayer.prototype = Object.create(MapLayer.prototype);

    function pollTilesState (id, tiles, scope) {
        var promise = $interval(function () {
            var loadingTiles = _.filter(tiles, function (tile) {
                return (tile.state == ol.TileState.LOADING);
            });
            if (loadingTiles.length > 0) {
                scope.$emit(id + ':isLoading', {
                    loading: loadingTiles.length,
                    total: tiles.length
                });
            } else {
                scope.$emit(id + ':finishedLoading');
            }
        }, 2000);
        return promise;
    }

    return WmsLayer;
}])

;