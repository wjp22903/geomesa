angular.module('stealth.mediator.static-targetpri', [
    'stealth.static.geo',
    'stealth.static.wizard',
    'stealth.targetpri.geo.ol3.layers'
])

.run([
'staticWorkspaceManager',
'staticLayerWizard',
'targetPriResultLayerExtender',
function (staticWorkspaceMgr, staticLayerWiz, tpExtender) {
    tpExtender.addCapabilitiesExtender(function (capabilities, opts) {
        capabilities['static'] = {
            toolTipText: 'Launch static data query wizard',
            iconClass: 'fa-database',
            onClick: function (name, record, capability) {
                _.each(_.deepGet(opts.dataSource.KeywordConfig, 'static'), function (config, workspace) {
                    var staticLayer = staticWorkspaceMgr.findLayer(workspace, opts.dataSource.Name);
                    if (staticLayer) {
                        var filter = opts.dataSource.fieldNames.id + "='" + record[opts.dataSource.fieldNames.id] + "'";
                        staticLayerWiz.launch(staticLayer, staticWorkspaceMgr.toggleLayer, {
                            title: opts.request.name + ' History for (' + filter + ')',
                            cql: filter,
                            startDtg: moment.utc(opts.request.startDtg),
                            endDtg: moment.utc(opts.request.endDtg)
                        });
                    }
                });
            }
        };
        return capabilities;
    });
}])
;