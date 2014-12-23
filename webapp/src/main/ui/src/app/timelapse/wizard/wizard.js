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
'stealth.timelapse.wizard.Query',
function ($rootScope, wizardManager, boundTlWizFactory,
          optionTlWizFactory, Wizard, Query) {
    this.launchWizard = function () {
        var wizardScope = $rootScope.$new();
        wizardScope.query = new Query();
        var baseWizard = new Wizard('Time-enabled Query', 'fa-clock-o', 'fa-check text-success', [], wizardScope);
        baseWizard.appendWizard(boundTlWizFactory.createBoundWiz(wizardScope));
        baseWizard.appendWizard(optionTlWizFactory.createQueryOptionWiz(wizardScope));
        wizardManager.launchWizard(baseWizard);
    };
}])
;
