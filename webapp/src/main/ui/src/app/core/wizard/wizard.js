angular.module('stealth.core.wizard', [
    'stealth.core.header',
    'stealth.core.sidebar'
])

.directive('stWizard', [
'wizardManager',
function (manager) {
    return {
        restrict: 'E',
        scope: {},
        templateUrl: 'core/wizard/wizard.tpl.html',
        controller: ['$scope', function ($scope) {
            $scope.manager = manager;
        }]
    };
}])

.factory('stealth.core.wizard.Wizard', [
function () {
    var Wizard = function (title, iconClass, endIconClass, steps, wizardScope) {
        var _title = title;
        var _iconClass = iconClass;
        var _endIconClass = endIconClass;
        var _steps = steps || [];
        var _wizardScope = wizardScope;

        this.getTitle = function () { return _title; };
        this.getIconClass = function () { return _iconClass; };
        this.getEndIconClass = function () { return _endIconClass; };
        this.setEndIconClass = function (newClass) { _endIconClass = newClass; };
        this.getSteps = function () { return _steps; };
        this.getWizardScope = function () { return _wizardScope; };
        this.truncateSteps = function (stepNum) {
            var index = stepNum + 1;
            _steps.splice(index, _steps.length - index);
        };
        this.appendWizard = function (otherWiz) {
            var otherEndIconClass = otherWiz.getEndIconClass();
            if (otherEndIconClass) {
                _endIconClass = otherEndIconClass;
            }
            _steps = _steps.concat(otherWiz.getSteps());
        };
    };
    return Wizard;
}])

.factory('stealth.core.wizard.Step', [
function () {
    var Step = function (title, formDef, toolDef, mask, setup, teardown) {
        var _title = title;
        var _formDef = formDef;
        var _toolDef = toolDef;
        var _mask = mask;
        var _setup = setup || _.noop;
        var _teardown = teardown || _.noop;

        this.getTitle = function () { return _title; };
        this.getFormDef = function () { return _formDef; };
        this.getToolDef = function () { return _toolDef; };
        this.getMask = function () { return _mask; };
        this.getSetup = function () { return _setup; };
        this.getTeardown = function () { return _teardown; };
    };
    return Step;
}])
;
