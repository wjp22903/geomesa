/**
 * This module provides a service which understands which attributes can be used for geom and lat/lon
 * attributes in an uploaded file.
 */
angular.module('stealth.upload.wizard.types', [
    'stealth.core.utils'
])

.service('stealth.upload.wizard.types.attributeTypeService', [
'stealth.core.utils.SFTAttributeTypes',
function (AttributeTypes) {
    var latLonBindings = ["Double"];
    this.isGeom = function (binding) {
        return AttributeTypes.geom.indexOf(binding) !== -1;
    };
    this.okForLatLon = function (binding) {
        return latLonBindings.indexOf(binding) !== -1;
    };
}])
;
