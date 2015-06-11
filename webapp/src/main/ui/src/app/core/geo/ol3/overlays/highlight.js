angular.module('stealth.core.geo.ol3.overlays.highlight', [
    'stealth.core.geo.ol3.map'
])

.service('highlightManager', [
'ol3Map',
function (ol3Map) {
    var _currentIndex = 0;
    var _highlightColors = [
        '#ff0080',
        '#00ff00',
        '#00ffeb',
        '#ff9933',
        '#ccff00'
    ];
    var _styles = _.map(_highlightColors, function (color) {
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
    });
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
}])
;
