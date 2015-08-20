angular.module('stealth.imagery.omar.wizard', [
    'stealth.core.utils',
    'stealth.core.wizard',
    'stealth.timelapse.wizard.bounds',
    'stealth.imagery.omar.wizard.query'
])

.service('stealth.imagery.omar.wizard', [
'$rootScope',
'CONFIG',
'wizardManager',
'stealth.core.wizard.Wizard',
'stealth.core.wizard.Step',
'stealth.core.utils.WidgetDef',
'stealth.imagery.omar.wizard.Query',
function ($rootScope, CONFIG, wizardManager, Wizard, Step, WidgetDef, Query) {
    this.launchWizard = function () {
        var wizardScope = $rootScope.$new();
        wizardScope.OMAR = CONFIG.imagery.omar;
        wizardScope.query = new Query(wizardScope.OMAR);
        var completion = function (success) {
            if (success) {
                $rootScope.$emit('imagery:search', wizardScope.query); // runner picks this up
            }
        };
        wizardManager.launchWizard(
            new Wizard('Imagery Search', 'fa-image', 'fa-check text-success', [
                new Step('Select data source', new WidgetDef('st-im-omar-wiz-source', wizardScope), null, true),
                new Step('Define search area', new WidgetDef('st-tl-wiz-bounds', wizardScope)),
                new Step('Define time range', new WidgetDef('st-tl-wiz-time', wizardScope), null, true),
                new Step('Choose options', new WidgetDef('st-im-omar-wiz-opts', wizardScope), null, true, null, completion)
            ], wizardScope)
        );
    };
}])

.directive('stImOmarWizSource',
function () {
    return {
        restrict: 'E',
        templateUrl: 'imagery/omar/wizard/templates/source.tpl.html'
    };
})

.directive('stImOmarWizOpts',
function () {
    return {
        restrict: 'E',
        templateUrl: 'imagery/omar/wizard/templates/options.tpl.html'
    };
})
;
