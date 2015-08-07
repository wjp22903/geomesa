angular.module('stealth.core.utils')

/**
 * Helper utility for obtaining bounds from a WPS gs:Query response
 */
.service('boundsHelper', [
function () {
    /**
     * Get bounds from the XML string response from gs:Query
     * @xmlString {string: example -
     * '<?xml version="1.0" encoding="UTF-8"?>
     *  <ows:BoundingBox xmlns:ows="http://www.opengis.net/ows/1.1" crs="EPSG:4326">
     *    <ows:LowerCorner>115.242 5.0261</ows:LowerCorner>
     *    <ows:UpperCorner>126.321 16.45</ows:UpperCorner>
     *  </ows:BoundingBox>' }
     *
     */
    this.boundsFromXMLString = function (xmlString) {
        var bounds = [];
        [].slice.call(ol.xml.parse(xmlString).firstChild.children).forEach(function (corner) {
            corner.textContent.split(' ').forEach(function (bound) { bounds.push(Number(bound)); });
        });
        return bounds;
    };
}])
;
