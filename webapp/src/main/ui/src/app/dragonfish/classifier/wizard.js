/**
 * Define a wizard to let a user run a classifier.
 */
angular.module('stealth.dragonfish.classifier.wizard', [
    'stealth.dragonfish',
    'stealth.dragonfish.classifier.runner',
    'stealth.timelapse.wizard.bounds'
])

/**
 * Create the scope associated with a wizard, for use in things like templates and such.
 */
.service('stealth.dragonfish.classifier.wizard.scope', [
'$rootScope',
'stealth.core.utils.WidgetDef',
'stealth.dragonfish.classifier.service',
'stealth.dragonfish.classifier.runner.Constant',
'stealth.dragonfish.classifier.runner.QueryParams',
function ($rootScope, WidgetDef, classifierService, runnerConstant, QueryParams) {
    var _creations = 0;

    this.create = function () {
        var wizardScope = $rootScope.$new();
        wizardScope.constant = runnerConstant;
        wizardScope.query = new QueryParams('Classifier Application ' + (_creations + 1));
        wizardScope.drawBoundsWidgetDef = new WidgetDef('st-df-wiz-bounds', wizardScope);
        wizardScope.isGeomSource = function () {
            return wizardScope.query.geomSource === runnerConstant.geom;
        };
        wizardScope.isImageIdSource = function () {
            return wizardScope.query.geomSource === runnerConstant.byid;
        };
        classifierService.getClassifiers()
            .then(function (classifiers) {
                wizardScope.classifiers = classifiers;
            });
        _creations++;
        return wizardScope;
    };
}])

/**
 * This service's `launchWizard` method kicks off a wizard which, on completion, fires a 'please apply a classifier' event
 */
.service('stealth.dragonfish.classifier.wizard.service', [
'$rootScope',
'wizardManager',
'stealth.core.wizard.Wizard',
'stealth.core.wizard.Step',
'stealth.core.utils.WidgetDef',
'stealth.dragonfish.Constant',
'stealth.dragonfish.classifier.Constant',
'stealth.dragonfish.classifier.wizard.scope',
function ($rootScope, wizardManager, Wizard, Step, WidgetDef, DF, ClassConstant, wizardScope) {
    this.launchWizard = function () {
        var scope = wizardScope.create();
        wizardManager.launchWizard(
            new Wizard('Apply Classifier', DF.icon, 'fa-check text-success', [
                new Step('Select and Configure Classifier', new WidgetDef('st-df-cl-wiz', scope), null, false,
                    _.noop,
                    function (success) {
                        if (success) {
                            $rootScope.$emit(ClassConstant.applyEvent, scope.query);
                            scope.$destroy();
                        }
                    },
                    false
                )
            ], scope)
        );
    };
}])

/**
 * Simple (ugly) template for the single wizard step
 */
.directive('stDfClWiz', [
function () {
    return {
        restrict: 'E',
        replace: true,
        templateUrl: 'dragonfish/classifier/wizard.tpl.html'
    };
}])

/**
 * Simple bounds template, uses controller from timelapse module
 */
.directive('stDfWizBounds',
function () {
    return {
        restrict: 'E',
        templateUrl: 'dragonfish/classifier/bounds.tpl.html',
        controller: 'boundWizController'
    };
})
;
