angular.module('stealth.targetpri.wizard.track', [
])

.factory('trackTpWizFactory', [
'stealth.core.wizard.Wizard',
'stealth.core.wizard.Step',
'stealth.core.utils.WidgetDef',
'sidebarManager',
'ol3Map',
function (Wizard, Step, WidgetDef, sidebarManager, ol3Map) {
    var self = {
        createSourceWiz: function (wizardScope) {
            return new Wizard(null, null, 'fa-ellipsis-h', [
                new Step('Select track source', new WidgetDef('st-tp-wiz-source', wizardScope), null, true,
                    function (stepNum) {
                        this.setEndIconClass('fa-ellipsis-h');
                        this.truncateSteps(stepNum);
                    },
                    function (stepNum, success) {
                        if (success) {
                            this.appendWizard(new Wizard(null, null, 'fa-ban text-danger', [
                                new Step('Under Construction', new WidgetDef('st-placeholder'), null, true)
                            ]));
                        }
                    }
                )
            ]);
        }
    };
    return self;
}])
;
