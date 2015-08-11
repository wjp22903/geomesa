/**
 * Provides the `activityWizard` service to launch a wizard.
 *
 * Other services in this module are intended for internal use within the module.
 */
angular.module('stealth.activity.wizard', [
    'stealth.activity.alerts',
    'stealth.activity.wizard.results'
])

.constant('stealth.activity.wizard.Display', {
    title: 'Find Activity Alerts',
    timeTitle: 'Define time range'
})

/**
 * This service provides a `launch` method to initiate a wizard to search for activity-based alerts
 */
.service('stealth.activity.wizard.activityWizard', [
'wizardManager',
'stealth.core.utils.WidgetDef',
'stealth.core.wizard.Wizard',
'stealth.core.wizard.Step',
'stealth.activity.Display',
'stealth.activity.wizard.Display',
'stealth.activity.wizard.runner',
'stealth.activity.wizard.scope',
function (wizardManager, WidgetDef, Wizard, Step, ActivityDisplay, WizardDisplay, runner, wizScope) {
    this.launch = function (layers, layer) {
        var wizardScope = wizScope.newScope(layers, layer); // destroyed by wizard teardown
        wizardManager.launchWizard(
            new Wizard(WizardDisplay.title, ActivityDisplay.icon, 'fa-check text-success', [
                new Step(
                    WizardDisplay.timeTitle,
                    new WidgetDef('st-activity-date-wiz', wizardScope),
                    null,
                    true,
                    null,
                    function (success) {
                        if (success) {
                            runner.run(wizardScope.params);
                        }
                    })
            ])
        );
    };
}])

/**
 * A wizard's scope has the following elements:
 *   layers: Array of alert layers to choose from
 *   params: A stealth.activity.wizard.runner.Types.RunParams
 */
.service('stealth.activity.wizard.scope', [
'$rootScope',
'stealth.activity.wizard.RunParams',
function ($rootScope, RunParams) {
    this.newScope = function (layers, layer) {
        var wizardScope = $rootScope.$new();
        wizardScope.layers = layers; // the available alert layers

        var now = moment().utc();
        var previously = now.clone().subtract(7, 'days');
        wizardScope.params = new RunParams(layer || layers[0], previously, now);
        return wizardScope;
    };
}])

.factory('stealth.activity.wizard.RunParams', [
function () {
    return function (layer, startDtg, endDtg) {
        this.layer = layer;
        this.startDtg = startDtg;
        this.endDtg = endDtg;
    };
}])

.service('stealth.activity.wizard.runner', [
'stealth.activity.wfs',
'stealth.activity.alerts.filteredAlertsLayerService',
'stealth.activity.wizard.results.resultsService',
function (wfs, filteredAlertsLayerService, resultsService) {
    /**
     * Run the WFS query to find alerts that satisfy the input parameters. Coordinate with the resultsService
     * to have a place to put results, and to hand them off when we've gotten them.
     * @param {stealth.activity.wizard.runner.InputParams} params
     */
    this.run = function (params) {
        var filterLayer = filteredAlertsLayerService.fromParams(params.layer, params.startDtg, params.endDtg);
        var results = resultsService.init(params.layer, filterLayer);
        wfs.getFeature(params.layer.Name, {cql_filter: filterLayer.cqlFilter})
            .success(function (data) {
                resultsService.setFeatures(results, (new ol.format.GeoJSON()).readFeatures(data));
            });
    };
}])

.directive('stActivityDateWiz', [
function () {
    return {
        restrict: 'E',
        templateUrl: 'activity/wizard/templates/date.tpl.html'
    };
}])
;
