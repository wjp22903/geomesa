angular.module('stealth.core.geo.ol3.overlays', [
    'stealth.core.geo.ol3.map'
])

.factory('stealth.core.geo.ol3.overlays.HighlightLayer', [
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
    var HighlightLayer = function (options) {
        var _options = options || {};
        var _currentIndex = 0;
        var _highlightColors = _options.colors || _defaultColors;
        var _styleBuilder = _options.styleBuilder || _defaultStyleBuilder;
        var _styles = _.map(_highlightColors, _styleBuilder);
        var _styleFunction = function (feature, resolution) {
            var index = _currentIndex;
            if (_.contains(feature.getKeys(), 'highlightColorIndex')) {
                return [_styles[(feature.get('highlightColorIndex') % _styles.length)]];
            } else {
                return [_styles[index]];
            }
        };

        var _overlay = ol3Map.getFeatureOverlay();
        _overlay.setStyle(_styleFunction);

        this.addFeature = function (feature) {
            var highlightColor;
            if (!_.contains(feature.getKeys(), 'highlightColorIndex')) {
                feature.set('highlightColorIndex', _currentIndex);
                highlightColor = _highlightColors[_currentIndex];
                _currentIndex = (_currentIndex + 1) % _styles.length;
            } else {
                highlightColor = _highlightColors[(feature.get('highlightColorIndex') % _styles.length)];
            }
            _overlay.addFeature(feature);
            return highlightColor;
        };

        this.removeFeature = function (feature) {
            _overlay.removeFeature(feature);
        };
    };

    return HighlightLayer;
}])
;
