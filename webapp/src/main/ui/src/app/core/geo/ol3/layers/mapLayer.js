angular.module('stealth.core.geo.ol3.layers')

.factory('stealth.core.geo.ol3.layers.MapLayer', [
'$log',
'$rootScope',
'$timeout',
'stealth.core.utils.WidgetDef',
function ($log, $rootScope, $timeout, WidgetDef) {
    var tag = 'stealth.core.geo.ol3.layers.MapLayer: ';
    $log.debug(tag + 'factory started');
    var _idSeq = 0;
    /**
     * name {String} - Display name for layer
     * ol3Layer {ol.layer.Layer} - Underlying OL3 layer impl
     * zIndexHint {Integer} - Suggestion for where layer should go in stack.
     *     Lower values suggest bottom of stack.
     *     Some values for expected categories:
     *         -20 base layers
     *         -10 context layers
     *           0 most layers (analysis, data, etc)
     *          10 overlays, drawings, etc
     *     These hints only apply when layer is added to stack.  Users can
     *     reorder as desired.  Also, once stack is reordered, the application
     *     of hints breaks down and layers may be inserted in unexpected order.
     */
    var MapLayer = function (name, ol3Layer, zIndexHint) {
        this.id = _idSeq++;
        this.name = name;
        this.ol3Layer = ol3Layer;
        this.zIndexHint = zIndexHint || 0;
        this.styleDirective = 'st-map-layer-style';
        if (ol3Layer) {
            var scope = $rootScope.$new();
            scope.layerState = {
                visible: ol3Layer.getVisible(),
                opacity: ol3Layer.getOpacity()
            };
            scope.toggleVisibility = function () {
                ol3Layer.setVisible(!ol3Layer.getVisible());
            };
            scope.$watch('layerState.opacity', function (newVal) {
                ol3Layer.setOpacity(newVal);
            });
            ol3Layer.set('id', this.id);
            ol3Layer.set('name', name);
            scope.ol3Layer = ol3Layer;
            scope.fragmentUrl = 'core/geo/ol3/layers/layer-fragments.tpl.html';
            scope.styleVars = {
                iconClass: 'fa fa-fw fa-lg fa-globe'
            };
            this.styleDirectiveScope = scope;

            // Update viewState on layer visibility change.
            ol3Layer.on('change:visible', function () {
                $timeout(function () {
                    scope.layerState.visible = ol3Layer.getVisible();
                });
            });
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
    MapLayer.prototype.setName = function (name) {
        this.name = name;
        this.ol3Layer.set('name', name);
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
