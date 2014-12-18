angular.module('stealth.timelapse.wizard', [
    'stealth.core.startmenu',
    'stealth.core.wizard',
    'stealth.timelapse.wizard.bounds',
    'stealth.timelapse.wizard.options',
    'stealth.timelapse.wizard.query'
])

.run([
'$rootScope',
'startMenuManager',
'wizardManager',
'boundTlWizFactory',
'optionTlWizFactory',
'stealth.core.wizard.Step',
'stealth.core.wizard.Wizard',
'stealth.timelapse.wizard.Query',
function ($rootScope, startMenuManager, wizardManager, boundTlWizFactory,
          optionTlWizFactory, Step, Wizard, Query) {

    var launchWizard = function () {
        var wizardScope = $rootScope.$new();
        wizardScope.query = new Query();
        var baseWizard = new Wizard('Timelapse Query', 'fa-history', 'fa-check text-success', [], wizardScope);
        baseWizard.appendWizard(boundTlWizFactory.createBoundWiz(wizardScope));
        baseWizard.appendWizard(optionTlWizFactory.createQueryOptionWiz(wizardScope));
        wizardManager.launchWizard(baseWizard);
    };
    startMenuManager.addButton('Timelapse Query', 'fa-history', launchWizard);
}])
;
