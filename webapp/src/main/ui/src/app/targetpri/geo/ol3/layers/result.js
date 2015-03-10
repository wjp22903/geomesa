angular.module('stealth.targetpri.geo.ol3.layers')

.factory('stealth.targetpri.geo.ol3.layers.TargetPriResultLayer', [
'stealth.core.geo.ol3.layers.WmsLayer',
'targetPriResultLayerExtender',
function (WmsLayer, targetPriResultLayerExtender) {
    var TargetPriResultLayer = function (name, requestParams, queryable, zIndexHint, wmsUrl, onLoad, request, dataSource) {
        WmsLayer.apply(this, arguments);
        var getCapabilities = this.getCapabilities;
        this.getCapabilities = function () {
            var capabilities = getCapabilities();
            return targetPriResultLayerExtender.extendCapabilities(capabilities, this, {
                dataSource: dataSource,
                request: request
            });
        };
    };
    TargetPriResultLayer.prototype = Object.create(WmsLayer.prototype);

    return TargetPriResultLayer;
}])

.service('targetPriResultLayerExtender', [
function () {
    var _capabilitiesExtenders = [];
    this.extendCapabilities = function (capabilities, thisArg, opts) {
        _.each(_capabilitiesExtenders, function (extender) {
            if (_.isFunction(extender)) {
                capabilities = extender.call(thisArg, capabilities, opts);
            }
        });
        return capabilities;
    };
    this.addCapabilitiesExtender = function (extender) {
        _capabilitiesExtenders.push(extender);
    };
}])
;