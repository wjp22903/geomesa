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
 * A service to fetch image metadata. This will become a WPS process, but we hard-code some example data for now.
 */
.service('stealth.dragonfish.classifier.imageMetadata.service', [
'$q',
'stealth.core.geo.ol3.utils.geomHelper',
'stealth.dragonfish.classifier.imageMetadata.ImageMetadata',
function ($q, geomHelper, ImageMetadata) {
    var possibleResults = {
        aa: new ImageMetadata('aa', moment.utc(), geomHelper.polygonFromExtentParts(-36.098, 17.554, -35.031, 18.029), 'VNIR', 8),
        bb: new ImageMetadata('bb', moment.utc(), geomHelper.polygonFromExtentParts(127.825, -20.554, 130.936, 21.029), 'GeoTIFF', 4),
        cc: new ImageMetadata('cc', moment.utc(), geomHelper.polygonFromExtentParts(-75.098, 80.554, -75.031, 80.029), 'GeoJPEG', 16)
    };
    this.lookupImgMeta = function (imageId) {
        return $q(function (resolve, reject) {
            setTimeout(function () {
                if (possibleResults[imageId]) {
                    resolve(possibleResults[imageId]);
                } else {
                    reject('Image Id "' + imageId + '" not found');
                }
            }, 1000);
        });
    };
}])
;
