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
    var VectorOverlay = function (options) {
        var _options = options || {};
        var _currentIndex = 0;
        var _overlayColors = _options.colors || _defaultColors;
        var _styleBuilder = _options.styleBuilder || _defaultStyleBuilder;
        var _styles = _.map(_overlayColors, _styleBuilder);
        var _styleFunction = function (feature, resolution) {
            var index = _currentIndex;
            if (_.contains(feature.getKeys(), 'vectorOverlayColorIndex')) {
                return [_styles[(feature.get('vectorOverlayColorIndex') % _styles.length)]];
            } else {
                return [_styles[index]];
            }
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
                _currentIndex = (_currentIndex + 1) % _styles.length;
            } else {
                overlayColor = _overlayColors[(feature.get('vectorOverlayColorIndex') % _styles.length)];
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
