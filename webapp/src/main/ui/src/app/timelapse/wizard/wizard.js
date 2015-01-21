angular.module('stealth.timelapse.wizard', [
    'stealth.core.startmenu',
    'stealth.core.wizard',
    'stealth.timelapse.wizard.bounds',
    'stealth.timelapse.wizard.options',
    'stealth.timelapse.wizard.query'
])

.run([
'startMenuManager',
'tlWizard',
function (startMenuManager, tlWizard) {
    startMenuManager.addButton('Time-enabled Query', 'fa-clock-o', tlWizard.launchWizard);
}])

.service('tlWizard', [
'$rootScope',
'wizardManager',
'boundTlWizFactory',
'optionTlWizFactory',
'stealth.core.wizard.Wizard',
'stealth.core.wizard.Step',
'stealth.core.utils.WidgetDef',
'stealth.timelapse.wizard.Query',
function ($rootScope, wizardManager, boundTlWizFactory,
          optionTlWizFactory, Wizard, Step, WidgetDef, Query) {
    this.launchWizard = function () {
        var wizardScope = $rootScope.$new();
        wizardScope.query = new Query();
        var baseWizard = new Wizard('Time-enabled Query', 'fa-clock-o', 'fa-check text-success', [
            new Step('Select data source', new WidgetDef('st-tl-wiz-source', wizardScope), null, true)
        ], wizardScope);
        baseWizard.appendWizard(boundTlWizFactory.createBoundWiz(wizardScope));
        baseWizard.appendWizard(optionTlWizFactory.createQueryOptionWiz(wizardScope));
        wizardManager.launchWizard(baseWizard);
    };
}])

.directive('stTlWizSource',
function () {
    return {
        restrict: 'E',
        templateUrl: 'timelapse/wizard/templates/source.tpl.html'
    };
})
;
