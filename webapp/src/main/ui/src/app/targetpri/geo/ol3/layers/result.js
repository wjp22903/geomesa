angular.module('stealth.targetpri.geo.ol3.layers')

.factory('stealth.targetpri.geo.ol3.layers.TargetPriResultLayer', [
'stealth.core.geo.ol3.layers.WmsLayer',
'targetPriResultLayerExtender',
function (WmsLayer, targetPriResultLayerExtender) {
    var TargetPriResultLayer = function (wmsOptions, request, dataSource) {
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

.service('targetPriResultLayerExtender', [
'coreCapabilitiesExtender',
'stealth.core.interaction.capabilities.Extender',
function (coreCapabilitiesExtender, Extender) {
    Extender.apply(this);

    var extendCapabilities = this.extendCapabilities;
    this.extendCapabilities = function (capabilities, thisArg, opts) {
        return extendCapabilities(coreCapabilitiesExtender.extendCapabilities(capabilities, thisArg, opts),
            thisArg, opts);
    };
}])
;
