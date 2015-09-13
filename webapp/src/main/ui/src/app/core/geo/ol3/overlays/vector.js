angular.module('stealth.core.geo.ol3.overlays', [
    'stealth.core.geo.ol3.map'
])

.factory('stealth.core.geo.ol3.overlays.Vector', [
'ol3Map',
function (ol3Map) {
    var _defaultColors = [
        '#ff0080',
        '#00ff00',
        '#00ffeb',
        '#ff9933',
        '#ccff00'
    ];
    var _defaultStyleBuilder = function (color) {
        return new ol.style.Style({
            image: new ol.style.RegularShape({
                fill: new ol.style.Fill({color: 'rgba(0,0,0,0)'}),
                points: 4,
                radius: 20,
                stroke: new ol.style.Stroke({
                    color: color,
                    width: 3
                })
            })
        });
    };

    /**
     * Creates a new unmanaged vector layer useful for changing individual feature
     * styles from other vector layers.
     * @class
     *
     * Builds a custom style using the provided color, feature and map resolution.
     * @callback styleBuilder
     * @param {string} color - The current color assigned to the feature being styled.
     * @param {ol.Feature} feature - The current feature being styled.
     * @param {number} resolution - The current map resolution.
     * @returns {ol.Style|[ol.Style]} The generated style for displaying the current feature.
     *
     * @param {Object} options - Configuration options for the new VectorOverlay layer.
     * @param {[string]} [options.colors] - A list of colors to cycle through for styling new features.
     * @param {styleBuilder} [options.styleBuilder] - Custom style builder for this VectorOverlay.
     */
    var VectorOverlay = function (options) {
        var _options = options || {};
        var _currentIndex = 0;
        var _overlayColors = _options.colors || _defaultColors;
        var _styleBuilder = _options.styleBuilder || _defaultStyleBuilder;
        var _styleFunction = function (feature, resolution) {
            var color = _overlayColors[_currentIndex];
            if (_.contains(feature.getKeys(), 'vectorOverlayColorIndex')) {
                color = _overlayColors[(feature.get('vectorOverlayColorIndex') % _overlayColors.length)];
            }
            var style = _styleBuilder(color, feature, resolution);
            return _.isArray(style) ? style : [style];
        };

        var _collection = new ol.Collection();
        var _ol3Source = new ol.source.Vector({
            features: _collection,
            useSpatialIndex: false
        });
        var _ol3Layer = new ol.layer.Vector({
            source: _ol3Source,
            style: _styleFunction
        });

        this.getFeatures = function () {
            return _collection;
        };

        this.addFeature = function (feature) {
            var overlayColor;
            if (!_.contains(feature.getKeys(), 'vectorOverlayColorIndex')) {
                feature.set('vectorOverlayColorIndex', _currentIndex);
                overlayColor = _overlayColors[_currentIndex];
                _currentIndex = (_currentIndex + 1) % _overlayColors.length;
            } else {
                overlayColor = _overlayColors[(feature.get('vectorOverlayColorIndex') % _overlayColors.length)];
            }
            _ol3Source.addFeature(feature);
            return overlayColor;
        };

        this.removeFeature = function (feature) {
            _ol3Source.removeFeature(feature);
        };

        this.addToMap = function () {
            ol3Map.addLayerOverlay(_ol3Layer);
        };

        this.removeFromMap = function () {
            ol3Map.removeLayerOverlay(_ol3Layer);
        };
    };

    return VectorOverlay;
}])
;