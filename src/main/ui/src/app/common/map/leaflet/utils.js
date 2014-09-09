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
            var lyr = element.target.getLayers()[0];
            var msg = {
                feature: lyr.feature,
                style: lyr.options.style
            };
            $rootScope.$emit('clicked on feature', msg);
        };

        return {
            LayerStyle: LayerStyle,
            onClick: onClick
        };
    }
])
;
