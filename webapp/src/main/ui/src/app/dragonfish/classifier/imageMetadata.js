/**
 * Methods and classes associated with fetching metadata for a given image id
 */
angular.module('stealth.dragonfish.classifier.imageMetadata')

/**
 * Data object for holding the response
 */
.factory('stealth.dragonfish.classifier.imageMetadata.ImageMetadata', [
function () {
    return function (imageId, dtg, polygon, type, niirs) {
        this.imageId = imageId;
        this.dtg = dtg;
        this.polygon = polygon;
        this.type = type; // listed in UI mock-up
        this.niirs = niirs; // image quality
        this.hasNIIRS = function () {
            return (_.isNumber(this.niirs) && this.niirs >= 0 && this.niirs < 10);
        };
    };
}])

/**
 * This service provides two methods:
 *   * lookupImgMeta(imageId): queries the backend for the metadata for the specified image
 *   * drawImageMetadata() takes the poly from an image metadata lookup and draws it on the map,
 *                         additionally re-centering the map to show the polygon
 */
.service('stealth.dragonfish.classifier.imageMetadata.service', [
'ol3Map',
'ol3Styles',
'stealth.core.geo.ol3.overlays.Vector',
'stealth.dragonfish.classifier.imageMetadata.ImageMetadata',
'stealth.dragonfish.configWps',
function (ol3Map, ol3Styles, VectorOverlay, ImageMetadata, wps) {
    var wktParser = new ol.format.WKT();
    this.lookupImgMeta = function (imageId) {
        var req = stealth.jst['wps/dragonfish_imageMetadata.xml']({
            imageID: imageId
        });
        return wps.submit(req).then(function (imageMetadata) {
            return new ImageMetadata(
                imageId,
                moment(imageMetadata.dtg, "x"), // Unix timestamp
                wktParser.readFeature(imageMetadata.wkt).getGeometry(),
                imageMetadata.src
            );
        });
    };
    this.drawImageMetadata = function (polygon) {
        var imageFeatureOverlay = new VectorOverlay({
            colors: ['#FFFF99'],
            styleBuilder: function () {
                return ol3Styles.getPolyStyle(1, '#FFFF99');
            }
        });
        imageFeatureOverlay.addFeature(new ol.Feature({geometry: polygon}));
        imageFeatureOverlay.addToMap();
        ol3Map.fit(polygon);
        return imageFeatureOverlay;
    };
}])
;
