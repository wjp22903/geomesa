angular.module('stealth.timelapse.wizard.options', [
    'stealth.core.utils',
    'stealth.core.wizard',
    'stealth.timelapse.wizard.query'
])

.factory('optionTlWizFactory', [
'queryService',
'stealth.core.utils.WidgetDef',
'stealth.core.wizard.Step',
'stealth.core.wizard.Wizard',
'stealth.timelapse.wizard.Query',
function (queryService, WidgetDef, Step, Wizard, Query) {
    var self = {
        createQueryOptionWiz: function (wizardScope) {
            if (!wizardScope.query) {
                wizardScope.query = new Query();
            }

            var submitQuery = function (stepNum, success) {
                if (success) {
                    queryService.launchBinQuery(this.getWizardScope().query);
                }
            };

            return new Wizard(null, null, null, [
                new Step('Define time range', new WidgetDef('st-tl-wiz-time', wizardScope), null, true),
                new Step('Set options', new WidgetDef('st-tl-wiz-options', wizardScope), null, true, null, submitQuery)
            ]);
        }
    };
    return self;
}])

.directive('stTlWizTime',
function () {
    return {
        restrict: 'E',
        templateUrl: 'timelapse/wizard/templates/time.tpl.html'
    };
})

.directive('stTlWizOptions',
function () {
    return {
        restrict: 'E',
        templateUrl: 'timelapse/wizard/templates/options.tpl.html'
    };
})
;
