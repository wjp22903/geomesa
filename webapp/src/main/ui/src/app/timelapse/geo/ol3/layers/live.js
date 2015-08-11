angular.module('stealth.timelapse.geo.ol3.layers', [
    'stealth.core.geo.ol3.map',
    'stealth.core.geo.ol3.overlays'
])

.factory('stealth.timelapse.geo.ol3.layers.LiveWmsLayer', [
'stealth.core.geo.ol3.layers.PollingImageWmsLayer',
'stealth.core.geo.ol3.overlays.Vector',
'tlWizard',
'summaryExploreMgr',
function (PollingImageWmsLayer, VectorOverlay, tlWizard, summaryExploreMgr) {
    var LiveWmsLayer = function (name, requestParams, layerThisBelongsTo, queryable, wmsUrl) {
        var _highlightLayer = new VectorOverlay();
        _highlightLayer.addToMap();

        PollingImageWmsLayer.call(this, {
            name: name,
            requestParams: requestParams,
            queryable: queryable,
            zIndexHint: 5,
            wmsUrl: wmsUrl,
            layerThisBelongsTo: layerThisBelongsTo
        });

        var getBaseCapabilities = this.getBaseCapabilities;
        this.getBaseCapabilities = function () {
            var capabilities = getBaseCapabilities();
            if (!_.isUndefined(capabilities['timelapse'])) {
                capabilities['timelapse']['toolTipText'] = 'Launch time-enabled query wizard';
                capabilities['timelapse']['iconClass'] = 'fa-clock-o';
                capabilities['timelapse']['onClick'] = function (name, record, capability) {
                    var idField = capability['trkIdField'] || 'id';
                    var filter = idField + "='" + record[idField] + "'";
                    var overrides = {
                        cql: filter,
                        storeName: 'History for ' + name + ' (' + filter + ')'
                    };
                    if (!_.isUndefined(capability['layerName'])) {
                        overrides['currentLayer'] = {
                            Name: capability['layerName']
                        };
                    }
                    tlWizard.launchWizard(overrides);
                };
            }
            return capabilities;
        };

        this.styleDirectiveScope.styleVars.iconClass = 'fa fa-fw fa-lg fa-clock-o';

        this.getHighlightLayer = function () {
            return _highlightLayer;
        };
    };
    LiveWmsLayer.prototype = Object.create(PollingImageWmsLayer.prototype);

    return LiveWmsLayer;
}])
;
