angular.module('stealth.common.map.leafletLayerStyle',[])
    .factory('LayerStyle', [function() {
        var LayerStyle = function(style) {
            this.color = style.color;
            this.fillColor = style.fillColor;
            this.stroke = true;
            this.weight = style.weight;
            this.opacity = style.opacity;
        };

        return LayerStyle;
    }])
;
