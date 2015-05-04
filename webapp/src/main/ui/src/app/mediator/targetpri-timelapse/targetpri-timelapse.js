angular.module('stealth.mediator.targetpri-timelapse', [

])

.run([
'targetPriResultLayerExtender',
'tlWizard',
function (tpExtender, tlWizard) {
    tpExtender.addCapabilitiesExtender(function (capabilities, opts) {
        capabilities['timelapse'] = {
            toolTipText: 'Launch time-enabled query wizard',
            iconClass: 'fa-clock-o',
            onClick: function (name, record, capability) {
                var filter = opts.dataSource.fieldNames.id + "='" + record[opts.dataSource.fieldNames.id] + "'";
                tlWizard.launchWizard({
                    startDtg: moment.utc(opts.request.startDtg),
                    endDtg: moment.utc(opts.request.endDtg),
                    cql: filter,
                    currentLayer: opts.dataSource,
                    storeName: opts.request.name + ' History for (' + filter + ')'
                });
            }
        };
        return capabilities;
    });
}])
;