angular.module('stealth.core.geo.ol3.style')

.service('ol3Styles', [
'colors',
function (colors) {
    this.getLineStyle = function (size, fillColor) {
        return new ol.style.Style({
            stroke: new ol.style.Stroke({color: '#FFFFFF', width: size + 2})
        }), new ol.style.Style({
            stroke: new ol.style.Stroke({color: '#000000', width: size + 1})
        }), new ol.style.Style({
            stroke: new ol.style.Stroke({color: fillColor, width: size})
        });
    };
    this.getPolyStyle = function (size, fillColor) {
        return new ol.style.Style({
            stroke: new ol.style.Stroke({color: fillColor, width: size}),
            fill: new ol.style.Fill({color: colors.hexStringToRgbArray(fillColor).concat(0.4)})
        });
    };
    this.getPointStyle = function (size, fillColor) {
        return new ol.style.Style({
            image: new ol.style.Circle({
                radius: size,
                fill: new ol.style.Fill({
                    color: fillColor
                }),
                stroke: new ol.style.Stroke({
                    color: '#FFFFFF',
                    width: 1
                })
            })
        });
    };
}])
;
