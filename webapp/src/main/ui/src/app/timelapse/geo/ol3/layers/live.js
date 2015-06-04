angular.module('stealth.timelapse.geo.ol3.layers', [
    'stealth.core.geo.ol3.map'
])

.factory('stealth.timelapse.geo.ol3.layers.LiveWmsLayer', [
'stealth.core.geo.ol3.layers.PollingImageWmsLayer',
'tlWizard',
'summaryExploreMgr',
function (PollingImageWmsLayer, tlWizard, summaryExploreMgr) {
    var LiveWmsLayer = function (name, requestParams, layerThisBelongsTo, queryable, wmsUrl) {
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
    };
    LiveWmsLayer.prototype = Object.create(PollingImageWmsLayer.prototype);

    return LiveWmsLayer;
}])
;
