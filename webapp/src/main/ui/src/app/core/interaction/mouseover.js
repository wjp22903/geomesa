angular.module('stealth.core.interaction.mouseover', [
    'stealth.core.geo.ol3.map'
])

.run([
'ol3Map',
function (ol3Map) {
    var MouseOverInteraction = function () {
        ol.interaction.Pointer.call(this, {
            handleMoveEvent: MouseOverInteraction.prototype.mouseover
        });
    };
    ol.inherits(MouseOverInteraction, ol.interaction.Pointer);

    MouseOverInteraction.prototype.mouseover = function (evt) {
        if (!_.isUndefined(this._layer)) {
            this._layer.onMouseLeave();
            this._layer = undefined;
        }

        var f;
        var l = evt.map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
            // Redundant, but necessary now that unmanaged layers ignore the layer filter.
            if (layer !== null && _.isFunction(layer.onMouseOver) && _.isFunction(layer.onMouseLeave)) {
                f = feature;
                return layer;
            }
            return false;
        },
        null,
        function (layer) {
            return (_.isFunction(layer.onMouseOver) && _.isFunction(layer.onMouseLeave));
        });

        if (!_.isUndefined(l)) {
            this._layer = l;
            this._layer.onMouseOver(f, l);
        }
    };

    ol3Map.addInteraction(new MouseOverInteraction());
}])
;
