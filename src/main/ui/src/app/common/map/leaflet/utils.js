angular.module('stealth.common.map.leaflet.utils',[

])

.factory('LeafletFeatures', [
    '$rootScope', function ($rootScope) {
        var LayerStyle = function(style) {
            this.color = style.color;
            this.fillColor = style.fillColor;
            this.stroke = true;
            this.weight = style.weight;
            this.opacity = style.opacity;
        };

        var onClick = function (element) {
            var msg = {
                feature: element.target.feature,
                style: element.target.options.style
            };
            $rootScope.$emit('clicked on feature', msg);
        };

        var onCreation = function (feature, layer) {
            layer.on({
                click: onClick
            });
        };

        return {
            LayerStyle: LayerStyle,
            onCreation: onCreation
        };
    }
])
;
