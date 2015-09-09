angular.module('stealth.core.geo.ol3.layers', [
    'stealth.core.utils'
])

.factory('stealth.core.geo.ol3.layers.DroppedLayer', [
'$log',
'stylepicker',
'ol3Map',
'colors',
'stealth.core.geo.ol3.layers.MapLayer',
function ($log, stylepicker, ol3Map, colors, MapLayer) {
    var tag = 'stealth.core.geo.ol3.layers.DroppedLayer: ';
    $log.debug(tag + 'factory started');

    // options must have a drag and dropped event
    var DroppedLayer = function (options) {
        var _options = options || {};
        var _self = this;
        var _queryable = _options.queryable || false;
        var _zIndexHint = _options.zIndexHint || 20;
        var _event = _options.event;
        var _name  = _event.file.name;
        var _viewState = {
            toggledOn: true,
            isError: false,
            errorMsg: '',
            fillColor: colors.getColor(),
            size: 4
        };
        var _ol3Source = new ol.source.Vector({
            features: _event.features
        });
        var _ol3Layer = new ol.layer.Vector({
            source: _ol3Source,
            style: stylepicker.styleFunction(_viewState)
        });

        $log.debug(tag + 'new Dropped Layer(' + arguments[0] + ')');
        MapLayer.apply(_self, [_name, _ol3Layer, _queryable, _zIndexHint]);
        _self.styleDirective = 'st-dropped-layer-style-view';
        _self.styleDirectiveScope.styleVars.iconClass = 'fa fa-fw fa-lg fa-file-o';
        _self.styleDirectiveScope.removeLayer = function (layer) {
            ol3Map.removeLayerById(layer.get('id'));
        };
    };
    DroppedLayer.prototype = Object.create(MapLayer.prototype);

    return DroppedLayer;
}])

.directive('stDroppedLayerStyleView', [
'$log',
function ($log) {
    var tag = 'stealth.core.geo.layers.stDroppedLayerStyleView: ';
    $log.debug(tag + 'directive defined');
    return {
        templateUrl: 'core/geo/ol3/layers/dropped-layerstyleview.tpl.html'
    };
}])

;
