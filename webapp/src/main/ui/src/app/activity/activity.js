/**
 * This plugin provides capability to analyze time-series data and detected alerts (notable changes in the
 * time-series) and a collection of monitored sites. This data all comes from layers, with no calculations
 * here on the front-end.
 *
 * In particular, we expect 3 geoserver layers:
 *   alerts: The detected alerts, and the layer with the configuration keywords
 *   sites: The locations where activity alerts might appear
 *   timeseries: The full timeseries associated with the sites
 * The alert layer should have a 'activity' keywords (<ctx>.activity.*),
 *   with more specific documentation in stealth.activity.alerts.Keywords
 */
angular.module('stealth.activity', [
    'stealth.activity.alerts',
    'stealth.activity.wizard'
])

.constant('stealth.activity.Display', {
    title: 'Activity Indicator',
    icon: 'fa-bell'
})

/**
 * A convenience service, wrapping core `wfs` to always use the `CONFIG.geoserver` defaults.
 */
.service('stealth.activity.wfs', [
'wfs',
'CONFIG',
function (wfs, CONFIG) {
    this.getFeature = function (layerName, overrides) {
        return wfs.getFeature(CONFIG.geoserver.defaultUrl, layerName, CONFIG.geoserver.omitProxy, overrides);
    };
}])

.run([
'startMenuManager',
'stealth.activity.Display',
'stealth.activity.alerts.layerService',
'stealth.activity.wizard.activityWizard',
function (startMenuManager, ActivityDisplay, layerService, activityWizard) {
    startMenuManager.addButton(ActivityDisplay.title, ActivityDisplay.icon, function () {
        layerService.getLayers(false)
            .then(function (workspaces) {
                var wizLayers = _.flatten(_.values(workspaces));
                activityWizard.launch(wizLayers);
            });
    });
}])
;
