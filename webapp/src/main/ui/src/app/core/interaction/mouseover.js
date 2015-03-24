angular.module('stealth.core.interaction.mouseover', [
    'stealth.core.geo.ol3.map'
])

.run([
'$log',
'ol3Map',
function ($log, ol3Map) {
    var MouseOverInteraction = function () {
        ol.interaction.Pointer.call(this, {
            handleMoveEvent: MouseOverInteraction.prototype.mouseover
        });

        this._layer;
    };
    ol.inherits(MouseOverInteraction, ol.interaction.Pointer);

    MouseOverInteraction.prototype.mouseover = function (evt) {
        if (!_.isUndefined(this._layer)) {
            this._layer.onMouseLeave();
            this._layer = undefined;
        }

        var f;
        var l = evt.map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
            f = feature;
            return layer;
        },
        null,
        function (layer) {
            return (!_.isUndefined(layer.onMouseOver) && _.isFunction(layer.onMouseOver)) &&
                   (!_.isUndefined(layer.onMouseLeave) && _.isFunction(layer.onMouseLeave));
        });

        if (!_.isUndefined(l)) {
            this._layer = l;
            this._layer.onMouseOver(f, l);
        }

    };

    ol3Map.addInteraction(new MouseOverInteraction());
}])

;