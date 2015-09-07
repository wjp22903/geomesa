angular.module('stealth.timelapse', [
    'stealth.core.popup.capabilities'
])

.service('summaryExploreMgr', [
'$timeout',
'toastr',
'ol3Map',
'stealth.core.geo.ol3.layers.GeoJsonVectorLayer',
'coreCapabilitiesExtender',
function ($timeout, toastr, ol3Map, GeoJsonVectorLayer, coreCapabilitiesExtender) {
    var self = this;
    this.toggleSummaryLayer = function (layer) {
        if (_.isUndefined(layer.mapLayerId) || _.isNull(layer.mapLayerId)) {
            var summaryLayer = new GeoJsonVectorLayer({
                name: layer.Title,
                layerThisBelongsTo: layer.layerThisBelongsTo,
                queryable: true,
                requestParams: {
                    CQL_FILTER: layer.cqlFilter
                }
            });
            layer.summaryLayer = summaryLayer;
            layer.mapLayerId = summaryLayer.id;
            layer.viewState.isOnMap = true;
            var ol3Layer = summaryLayer.getOl3Layer();
            layer.viewState.toggledOn = ol3Layer.getVisible();
            summaryLayer.styleDirectiveScope.styleVars.iconClass = 'fa fa-fw fa-lg fa-clock-o';
            summaryLayer.styleDirectiveScope.removeLayer = function () {
                self.removeSummaryLayer(layer);
            };
            ol3Map.addLayer(summaryLayer);

            // Update viewState on layer visibility change.
            ol3Layer.on('change:visible', function () {
                $timeout(function () {
                    summaryLayer.getViewState().toggledOn = ol3Layer.getVisible();
                });
            });
        } else {
            ol3Map.removeLayerById(layer.mapLayerId);
            delete layer.mapLayerId;
            delete layer.summaryLayer;
            layer.viewState.isOnMap = false;
        }
    };

    this.removeSummaryLayer = function (layer) {
        if (layer.viewState.isOnMap) {
            self.toggleSummaryLayer(layer);
        }
        _.pull(layer.layerThisBelongsTo.summaries, layer);
    };

    this.workspaces = {};

    this.summaryQuery = function (name, record, capability) {
        if (_.isEmpty(capability.layerName) ||
            _.isEmpty(capability.trkIdField) ||
            _.isEmpty(record[capability.trkIdField])) {
            toastr.error(name + ' is missing information required to perform summary search.', 'Summary Error');
            return;
        }

        var layer = _.find(_.flatten(_.values(self.workspaces)),
            {Name: capability['layerName']});
        if (layer) {
            var summary = {
                layerThisBelongsTo: layer,
                Name: capability['layerName'],
                Title: name,
                viewState: {
                    isOnMap: false,
                    toggledOn: false,
                    isLoading: false,
                    isExpanded: true,
                    isRemovable: true
                },
                cqlFilter: '(' + capability['trkIdField'] + '=\'' + record[capability['trkIdField']] + '\')'
            };

            layer.summaries.push(summary);
            self.toggleSummaryLayer(summary);
        } else {
            toastr.error(capability['layerName'] + ' not found.', 'Summary Error');
        }
    };

    coreCapabilitiesExtender.addCapabilitiesExtender(function (capabilities) {
        if (!_.isUndefined(capabilities['summary'])) {
            capabilities['summary']['toolTipText'] = 'Get summary';
            capabilities['summary']['iconClass'] = 'fa-location-arrow';
            capabilities['summary']['onClick'] = self.summaryQuery;
        }
        return capabilities;
    });
}])
;
