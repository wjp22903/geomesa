angular.module('stealth.timelapse.geo.ol3.layers', [
    'stealth.core.geo.ol3.map'
])

.factory('stealth.timelapse.geo.ol3.layers.LiveWmsLayer', [
'stealth.core.geo.ol3.layers.PollingImageWmsLayer',
'summaryExploreMgr',
'ol3Map',
function (PollingImageWmsLayer, summaryExploreMgr, ol3Map) {
    var LiveWmsLayer = function (name, requestParams, layerThisBelongsTo, queryable, wmsUrl) {
        PollingImageWmsLayer.apply(this, [name, requestParams, queryable, 5, wmsUrl]);
        var self = this;
        var _layerThisBelongsTo = layerThisBelongsTo;

        var searchPoint = this.searchPoint;
        this.searchPoint = function (coord, res) {
            var buffer = 5;
            if (!_.isUndefined(ol3Map.getView().getZoom())) {
                buffer = Math.pow(ol3Map.getView().getZoom(), 2);
            }
            return searchPoint.call(this, coord, res, {
                BUFFER: buffer
            });
        };

        this.getBaseCapabilities = function () {
            return _.cloneDeep(_layerThisBelongsTo.KeywordConfig.capability);
        };

        this.styleDirectiveScope.styleVars.iconClass = 'fa fa-fw fa-lg fa-clock-o';
    };
    LiveWmsLayer.prototype = Object.create(PollingImageWmsLayer.prototype);

    return LiveWmsLayer;
}])
;
