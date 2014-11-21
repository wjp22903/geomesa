angular.module('stealth.core.geo.ol3.layers')

.factory('stealth.core.geo.ol3.layers.MapLayer', [
'$log',
'$rootScope',
'stealth.core.utils.WidgetDef',
function ($log, $rootScope, WidgetDef) {
    var tag = 'stealth.core.geo.ol3.layers.MapLayer: ';
    $log.debug(tag + 'factory started');
    var _idSeq = 0;
    var MapLayer = function (name, ol3Layer) {
        this.id = _idSeq++;
        this.name = name;
        this.ol3Layer = ol3Layer;
        this.styleDirective = 'st-map-layer-style';
        if (ol3Layer) {
            var scope = $rootScope.$new();
            scope.visible = ol3Layer.getVisible();
            scope.opacity = ol3Layer.getOpacity();
            ol3Layer.set('id', this.id);
            ol3Layer.set('name', name);
            scope.ol3Layer = ol3Layer;
            scope.fragmentUrl = 'core/geo/ol3/layers/layer-fragments.tpl.html';
            this.styleDirectiveScope = scope;
        }
        this.styleDirectiveIsoScopeAttrs = null;
        $log.debug(tag + 'new MapLayer(' + name + ')');
    };

    MapLayer.prototype.getStyleDisplayDef = function () {
        if (!this.styleDisplayDef) {
            this.styleDisplayDef = new WidgetDef(
                this.styleDirective, this.styleDirectiveScope,
                this.styleDirectiveIsoScopeAttrs);
        }
        return this.styleDisplayDef;
    };
    MapLayer.prototype.getId = function () {
        return this.id;
    };
    MapLayer.prototype.getOl3Layer = function () {
        return this.ol3Layer;
    };

    return MapLayer;
}])

.directive('stMapLayerStyle', [
'$log',
function ($log) {
    $log.debug('stealth.core.geo.ol3.layers.stMapLayerStyle: directive defined');
    return {
        template: '<ui-include src="fragmentUrl" fragment="\'.layerStyleMapLayer\'"></ui-include>'
    };
}])

;
