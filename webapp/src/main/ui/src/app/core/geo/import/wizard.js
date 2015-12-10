angular.module('stealth.core.geo.import.wizard', [
    'stealth.core.startmenu',
    'stealth.core.utils',
    'stealth.core.wizard',
    'stealth.core.geo.import.shapefile'
])

.constant('stealth.core.geo.import.wizard.Constants', {
    name: "Shapefile Import",
    icon: "fa-map-o"
})

.run([
'startMenuManager',
'wizardManager',
'stealth.core.geo.import.wizard.Constants',
'stealth.core.geo.import.wizard.WizFactory',
function (startMenuManager, wizardManager, Constants, wizardFactory) {
    var launch = function () {
        wizardManager.launchWizard(wizardFactory.createWizard());
    };
    startMenuManager.addButton(Constants.name, Constants.icon, launch);
}])

.factory('stealth.core.geo.import.wizard.WizFactory', [
'$rootScope',
'stealth.core.wizard.Wizard',
'stealth.core.geo.import.wizard.Constants',
'shapefile.StepFactory',
function ($rootScope, Wizard, Constants, shapefile) {
    var self = {
        /**
         * Get a new upload Wizard, with its scope and steps established.
         */
        createWizard: function () {
            var wizardScope = $rootScope.$new();

            return new Wizard(
                Constants.name,
                Constants.icon,
                'fa-check text-success',
                [
                    shapefile.createStep(wizardScope)
                ],
                wizardScope
            );
        }
    };
    return self;
}])
;
