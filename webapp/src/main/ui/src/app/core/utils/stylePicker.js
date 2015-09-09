angular.module('stealth.core.utils')

.service('stylepicker', [
'$log',
'ol3Styles',
function ($log, ol3Styles) {
    var tag = "stealth.core.utils.stylepicker";
    var self = this;

    this.defaultStyleMatcher = function (feature, viewState) {
        var style = [];
        var size = viewState.size;
        var fillColor = viewState.fillColor;
        switch (feature.getGeometry().getType()) {
            case 'MultiLineString':
                style.push(ol3Styles.getLineStyle(size, fillColor));
                break;
            case 'LinearRing':
                $log.warn('In: ' + tag + ', no style defined for \'LinearRing\'');
                break;
            case 'LineString':
                style.push(ol3Styles.getLineStyle(size, fillColor));
                break;
            case 'MultiPolygon':
                style.push(ol3Styles.getPolyStyle(size, fillColor));
                break;
            case 'Circle':
                $log.warn('In: ' + tag + ', no style defined for \'Circle\'');
                break;
            case 'Polygon':
                style.push(ol3Styles.getPolyStyle(size, fillColor));
                break;
            case 'MultiPoint':
                style.push(ol3Styles.getPointStyle(size, fillColor));
                break;
            case 'Point':
                style.push(ol3Styles.getPointStyle(size, fillColor));
                break;
        }
        return style;
    };

    this.hiddenStyleFunction = function (viewState, feature, resolution) {
        var featureStyleFunction = feature.getStyleFunction();
        if (featureStyleFunction) {
            return featureStyleFunction.call(feature, resolution);
        } else {
            return self.defaultStyleMatcher(feature, viewState);
        }
    };

    this.styleFunction = function (viewState) {
        var curried = _.curry(self.hiddenStyleFunction);
        return curried(viewState);
    };
}])
;
