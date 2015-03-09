angular.module('stealth.targetpri.wizard', [
    'stealth.core.geo.ol3.map',
    'stealth.core.startmenu',
    'stealth.core.utils',
    'stealth.core.wizard',
    'stealth.targetpri.wizard.route',
    'stealth.targetpri.wizard.track'
])

.run([
'$rootScope',
'startMenuManager',
'wizardManager',
'stealth.core.wizard.Wizard',
'stealth.core.wizard.Step',
'stealth.core.utils.WidgetDef',
'routeTpWizFactory',
'trackTpWizFactory',
function ($rootScope, startMenuManager, wizardManager, Wizard, Step,
    WidgetDef, routeWizFac, trackWizFac) {
    var _idSeq = 1;
    var launchWizard = function () {
        var wizardScope = $rootScope.$new();
        angular.extend(wizardScope, {
            name: 'Target ID ' + _idSeq++,
            type: 'route',
            source: 'drawing',
            datasources: []
        });
        wizardManager.launchWizard(
            new Wizard('Target Identification', 'fa-crosshairs', 'fa-ellipsis-h', [
                new Step('Select input type', new WidgetDef('st-tp-wiz-type', wizardScope), null, true,
                    function (stepNum) {
                        this.setEndIconClass('fa-ellipsis-h');
                        this.truncateSteps(stepNum);
                    },
                    function (stepNum, success) {
                        if (success) {
                            switch (wizardScope.type) {
                                case 'site':
                                    //TODO
                                    break;
                                case 'route':
                                    this.appendWizard(routeWizFac.createSourceWiz(wizardScope));
                                    break;
                                case 'track':
                                    this.appendWizard(trackWizFac.createSourceWiz(wizardScope));
                                    break;
                            }
                        }
                    }
                )
            ])
        );
    };
    startMenuManager.addButton('Target Identification', 'fa-crosshairs', launchWizard);
}])

.directive('stTpWizType', [
function () {
    return {
        restrict: 'E',
        replace: true,
        templateUrl: 'targetpri/wizard/templates/type.tpl.html'
    };
}])

.directive('stTpWizSource', [
function () {
    return {
        restrict: 'E',
        replace: true,
        templateUrl: 'targetpri/wizard/templates/source.tpl.html'
    };
}])

.directive('stTpWizDraw', [
function () {
    return {
        restrict: 'E',
        replace: true,
        templateUrl: 'targetpri/wizard/templates/draw.tpl.html'
    };
}])
;
