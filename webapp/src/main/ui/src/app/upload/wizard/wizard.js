/**
 * The majority of the work for Feature Upload is in the wizard (and the backend).
 * When the wizard is done, we just fire an event that suggests that layers may have updated,
 * and allow other modules (e.g., static, timelapse) to refresh their layer lists, to hopefully
 * include the newly uploaded layer.
 */
angular.module('stealth.upload.wizard', [
    'stealth.core.startmenu',
    'stealth.core.utils',
    'stealth.core.wizard',
    'stealth.upload.wizard.file',
    'stealth.upload.wizard.geom',
    'stealth.upload.wizard.ingest',
    'stealth.upload.wizard.schema'
])

.constant('stealth.upload.wizard.Constants', {
    name: "Feature Upload",
    icon: "fa-cloud-upload"
})

/**
 * Hook up the start menu button on startup
 */
.run([
'startMenuManager',
'wizardManager',
'stealth.upload.wizard.Constants',
'stealth.upload.wizard.UploadWizardFactory',
function (startMenuManager, wizardManager, Constants, wizardFactory) {
    var launch = function () {
        wizardManager.launchWizard(wizardFactory.createWizard());
    };
    startMenuManager.addButton(Constants.name, Constants.icon, launch);
}])

/**
 * Responsible for creating scope objects for use in the wizard.
 *
 * Note that, at the moment, other modules add to this scope, so this is not the sole source of
 * the definition of the scope 'api'.
 */
.factory('stealth.upload.wizard.ScopeFactory', [
'$rootScope',
'CONFIG',
'stealth.core.utils.SFTAttributeTypes',
function ($rootScope, CONFIG, AttributeTypes) {
    var self = {
        /**
         * Get a new scope. Remember to $destroy it when you're done, this factory will not do it for you.
         */
        createScope: function () {
            var wizardScope = $rootScope.$new();
            wizardScope.attributeTypes = AttributeTypes;
            var proxy = (CONFIG.geoserver.omitProxy) ? "" : "cors/";
            var baseUri = CONFIG.geoserver.defaultUrl + "/geomesa/csvupload";
            wizardScope.file = {
                proxy: proxy,
                baseUri: baseUri,
                uuid: null
            };
            return wizardScope;
        }
    };
    return self;
}])

.factory('stealth.upload.wizard.UploadWizardFactory', [
'$rootScope',
'stealth.core.wizard.Wizard',
'stealth.upload.wizard.Constants',
'stealth.upload.wizard.ScopeFactory',
'stealth.upload.wizard.file.StepFactory',
'stealth.upload.wizard.geom.StepFactory',
'stealth.upload.wizard.ingest.StepFactory',
'stealth.upload.wizard.schema.StepFactory',
function ($rootScope, Wizard, Constants, ScopeFactory,
          fileStepFactory, geomStepFactory, ingestStepFactory, schemaStepFactory) {
    var updateLayers = function () {
        // TODO make these strings .constant-s, where they make sense, and use them consistently
        /**
         * Knowing the keyword prefixes may be too strong a coupling to other modules, contradicting the goal
         * of just emitting a 'please update' message to anybody who should be listening.
         *
         * We consider this owsLayers:update eventing to be prototypical for now, with additional changes and
         * refactoring reserved for future work.
         */
        $rootScope.$emit('owsLayers:update',
            {
                keywordPrefixes: [
                    "static",
                    "timelapse"
                ]
            }
        );
    };

    var self = {
        /**
         * Get a new upload Wizard, with its scope and steps established.
         */
        createWizard: function () {
            var wizardScope = ScopeFactory.createScope();

            return new Wizard(
                Constants.name,
                Constants.icon,
                'fa-check text-success',
                [
                    fileStepFactory.createStep(wizardScope),
                    schemaStepFactory.createStep(wizardScope),
                    geomStepFactory.createStep(wizardScope),
                    ingestStepFactory.createStep(wizardScope, _.noop, updateLayers)
                ],
                wizardScope
            );
        }
    };
    return self;
}])
;
