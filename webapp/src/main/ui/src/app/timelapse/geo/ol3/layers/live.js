angular.module('stealth.timelapse.geo.ol3.layers')

.factory('stealth.timelapse.geo.ol3.layers.LiveWmsLayer', [
'stealth.core.geo.ol3.layers.PollingImageWmsLayer',
'summaryExploreMgr',
function (PollingImageWmsLayer, summaryExploreMgr) {
    var LiveWmsLayer = function (name, requestParams, layerThisBelongsTo, queryable, wmsUrl) {
        var _layerThisBelongsTo = layerThisBelongsTo;

        PollingImageWmsLayer.apply(this, [name, requestParams, queryable, 5, wmsUrl]);

        var searchPoint = this.searchPoint;
        this.searchPoint = function () {
            return searchPoint.apply(this, arguments).then(function (response) {
                var capabilities = _layerThisBelongsTo.KeywordConfig.capability || {};
                if (!_.isUndefined(capabilities['summary'])) {
                    capabilities['summary']['toolTipText'] = 'Get summary';
                    capabilities['summary']['iconClass'] = 'fa-location-arrow';
                    capabilities['summary']['onClick'] = summaryExploreMgr.summaryQuery;
                }
                response.capabilities = capabilities;
                return response;
            });
        };
        this.styleDirectiveScope.styleVars.iconClass = 'fa fa-fw fa-lg fa-clock-o';
    };
    LiveWmsLayer.prototype = Object.create(PollingImageWmsLayer.prototype);

    return LiveWmsLayer;
}])
;
