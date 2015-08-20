angular.module('stealth.mediator.histogram-timelapse', [
    'stealth.histogram.wizard',
    'stealth.timelapse.stores'
])

.run([
'histogramWizard',
'queryBinStoreExtender',
function (histogramWizard, queryBinStoreExtender) {
    queryBinStoreExtender.addCapabilitiesExtender(function (capabilities, opts) {
        var self = this;
        if (!_.isUndefined(capabilities['histogram'])) {
            capabilities['histogram']['toolTipText'] = 'Make histogram';
            capabilities['histogram']['iconClass'] = 'fa-bar-chart';
            capabilities['histogram']['onClick'] = function () {
                var query = _.cloneDeep(self.getQuery());
                query.params.startDtg = moment.utc(opts.startMillis);
                query.params.endDtg = moment.utc(opts.endMillis);
                query.origin = 'time-lapse';
                histogramWizard.launch(query.params.storeName, query);
            };
        }
        return capabilities;
    });
}])
;
