angular.module('stealth.dragonfish.geo.ol3.layers')

.constant('stealth.dragonfish.geo.ol3.layers.EntityConstant', {
    removeEvent: 'dragonfish.layer.entity.remove'
})

.run([
'$rootScope',
'categoryManager',
'ol3Map',
'stealth.dragonfish.geo.ol3.layers.EntityConstant',
function ($rootScope, catMgr, ol3Map, EL) {
    // handle the remove event behavior here, for when the layer is removed via the `style` view
    $rootScope.$on(EL.removeEvent, function (evt, state) { // eslint-disable-line no-unused-vars
        ol3Map.removeLayerById(state.layerId);
        catMgr.removeCategory(state.categoryId);
    });
}])

.factory('stealth.dragonfish.geo.ol3.layers.EntityLayer', [
'$log',
'$rootScope',
'stylepicker',
'colors',
'stealth.dragonfish.Constant',
'stealth.core.geo.ol3.layers.MapLayer',
'stealth.dragonfish.geo.ol3.layers.EntityConstant',
function ($log, $rootScope, stylepicker, colors, DF, MapLayer, EL) {
    var tag = 'stealth.dragonfish.geo.ol3.layers.EntityLayer: ';
    $log.debug(tag + 'factory started');

    /**
     *  The `options` object must contain the following properties:
     *     1. `name`, the name of the new layers
     *     2. `features`, the array of ol.Feature(s)
     *     3. `categoryId`, the id of the category this entity layer belongs to
     *
     */
    var EntityLayer = function (options) {
        var _options = options || {};
        var _self = this;
        var _queryable = _options.queryable || false;
        var _zIndexHint = _options.zIndexHint || 20;
        var _features = _options.features;
        var _name  = _options.name;
        var _categoryid = _options.categoryId;
        var _viewState = {
            toggledOn: true,
            isError: false,
            errorMsg: '',
            fillColor: colors.getColor(),
            size: 4
        };
        var _ol3Source = new ol.source.Vector({
            features: _features
        });
        var _ol3Layer = new ol.layer.Vector({
            source: _ol3Source,
            style: stylepicker.styleFunction(_viewState)
        });

        $log.debug(tag + 'new Entity Layer(' + arguments[0] + ')');
        MapLayer.apply(_self, [_name, _ol3Layer, _queryable, _zIndexHint]);
        _self.styleDirective = 'st-entity-layer-style-view';
        _self.styleDirectiveScope.styleVars.iconClass = 'fa fa-fw fa-lg ' + DF.icon;
        _self.styleDirectiveScope.removeLayer = function () {
            $rootScope.$emit(EL.removeEvent, {layerId: _self.id, categoryId: _categoryid});
        };
    };
    EntityLayer.prototype = Object.create(MapLayer.prototype);

    return EntityLayer;
}])

.directive('stEntityLayerStyleView', [
'$log',
function ($log) {
    var tag = 'stealth.dragonfish.geo.ol3.layers.stEntityLayerStyleView: ';
    $log.debug(tag + 'directive defined');
    return {
        templateUrl: 'core/geo/ol3/layers/dropped-layerstyleview.tpl.html'
    };
}])

;
