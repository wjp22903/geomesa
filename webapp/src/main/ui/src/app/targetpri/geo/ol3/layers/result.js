angular.module('stealth.targetpri.geo.ol3.layers', [
    'stealth.core.popup.capabilities'
])

.factory('stealth.targetpri.geo.ol3.layers.TargetPriResultLayer', [
'stealth.core.geo.ol3.layers.WmsLayer',
'stealth.targetpri.geo.ol3.layers.targetPriResultLayerExtender',
function (WmsLayer, targetPriResultLayerExtender) {
    var TargetPriResultLayer = function (wmsOptions, request, dataSource) {
        wmsOptions.layerThisBelongsTo = dataSource;
        WmsLayer.call(this, wmsOptions);
        this.getCapabilitiesExtender = function () {
            return targetPriResultLayerExtender;
        };
        this.getCapabilitiesOpts = function () {
            return {
                dataSource: dataSource,
                request: request
            };
        };
    };
    TargetPriResultLayer.prototype = Object.create(WmsLayer.prototype);
    return TargetPriResultLayer;
}])

.service('stealth.targetpri.geo.ol3.layers.targetPriResultLayerExtender', [
'coreCapabilitiesExtender',
'stealth.core.popup.capabilities.Extender',
function (coreCapabilitiesExtender, Extender) {
    Extender.apply(this);

    var extendCapabilities = this.extendCapabilities;
    this.extendCapabilities = function (capabilities, thisArg, opts) {
        return extendCapabilities(coreCapabilitiesExtender.extendCapabilities(capabilities, thisArg, opts),
            thisArg, opts);
    };
}])
;
