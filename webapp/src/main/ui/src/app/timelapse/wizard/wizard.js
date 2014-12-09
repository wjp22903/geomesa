angular.module('stealth.timelapse.wizard', [
    'stealth.core.startmenu',
    'stealth.core.wizard',
    'stealth.timelapse.wizard.bounds'
])

.run([
'$rootScope',
'startMenuManager',
'wizardManager',
'boundTlWizFactory',
'stealth.core.wizard.Step',
'stealth.core.wizard.Wizard',
function ($rootScope, startMenuManager, wizardManager, boundTlWizFactory, Step, Wizard) {
    var launchWizard = function () {
        var wizardScope = $rootScope.$new();
        var baseWizard = new Wizard('Timelapse Query', 'fa-history', 'fa-check text-success', []);
        baseWizard.appendWizard(boundTlWizFactory.createBoundsWiz(wizardScope));
        wizardManager.launchWizard(baseWizard);
    };
    startMenuManager.addButton('Timelapse Query', 'fa-history', launchWizard);
}])
;
