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
 * A service to fetch image metadata: lookupImgMeta(). This will become a WPS process, but we hard-code some example data for now.
 * drawImageMetadata() will take an ImageMetadata polygon and draw it on the map, recentering the map to show the figure
 */
.service('stealth.dragonfish.classifier.imageMetadata.service', [
'$q',
'CONFIG',
'ol3Map',
'ol3Styles',
'stealth.core.geo.ol3.overlays.Vector',
'stealth.core.geo.ol3.utils.geomHelper',
'stealth.dragonfish.classifier.imageMetadata.ImageMetadata',
function ($q, CONFIG, ol3Map, ol3Styles, VectorOverlay, geomHelper, ImageMetadata) {
    var possibleResults = {};
    var imageIds = _.get(CONFIG, 'dragonfish.imageIds', []);
    _.each(imageIds, function (imageMetadata) {
        possibleResults[imageMetadata.name] = new ImageMetadata(
            imageMetadata.name,
            (imageMetadata.date !== '' ? moment(imageMetadata.date) : moment.utc()),
            geomHelper.polygonFromExtent(imageMetadata.extent),
            imageMetadata.type,
            imageMetadata.niirs
        );
    });
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
