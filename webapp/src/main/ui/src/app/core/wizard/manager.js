angular.module('stealth.core.wizard')

.service('wizardManager', [
'sidebarManager',
'headerManager',
function (sidebarManager, headerManager) {
    var _wizard = null;
    var _visible = false;
    var _currentStepNum = null;
    var _mask = true;

    var _updateCurrentStep = function (stepNum, skipTeardown) {
        if (_wizard && !_.isEmpty(_wizard.getSteps())) {
            if (_.isNumber(_currentStepNum) && !skipTeardown) {
                _wizard.getSteps()[_currentStepNum].getTeardown()
                    .call(_wizard, _currentStepNum, stepNum > _currentStepNum);
            }
            var step = _wizard.getSteps()[stepNum];
            if (step) {
                step.getSetup().call(_wizard, stepNum);
                _mask = step.getMask();
                _currentStepNum = stepNum;
            }
        }
    };

    this.getVisible = function () { return _visible; };
    this.getCurrentStepNum = function () { return _currentStepNum; };
    this.getCurrentStep = function () {
        if (_wizard) {
            var steps = _wizard.getSteps();
            if (!_.isEmpty(steps)) {
                return steps[_currentStepNum];
            }
        }
        return null;
    };
    this.getMask = function () { return _mask; };
    this.getIconClass = function () {
        return _wizard ? _wizard.getIconClass() : null;
    };
    this.getSteps = function () {
        return _wizard ? _wizard.getSteps() : [];
    };
    this.getEndIconClass = function () {
        return _wizard ? _wizard.getEndIconClass() : null;
    };
    this.isLastStep = function () {
        return (_wizard && _currentStepNum === _wizard.getSteps().length - 1);
    };
    this.isCurrentStepInvalid = function () {
        var step = this.getCurrentStep();
        if (step) {
            var formDef = step.getFormDef();
            if (formDef) {
                var scope = formDef.getScope();
                if (scope) {
                    return scope.wizardForm && scope.wizardForm.$invalid;
                }
            }
        }
        return false;
    };
    this.launchWizard = function (wizard) {
        this.closeWizard();
        headerManager.setVisible(false);
        _wizard = wizard;
        sidebarManager.setHideAll(true);
        sidebarManager.setSidebarText(_wizard.getTitle());
        _updateCurrentStep(0);
        _visible = true;
    };
    this.closeWizard = function (success) {
        if (_wizard) {
            if (_.isNumber(_currentStepNum)) {
                _wizard.getSteps()[_currentStepNum].getTeardown()
                    .call(_wizard, _currentStepNum, success);
                if (success && !this.isLastStep()) {
                    return _updateCurrentStep(_currentStepNum + 1, true); //not done yet!
                }
            }
        }
        _visible = false;
        _currentStepNum = null;
        _mask = false;
        _wizard = null;
        sidebarManager.setSidebarText();
        sidebarManager.setHideAll(false);
        headerManager.setVisible(true);
    };
    this.jumpToPastStep = function (stepNum) {
        if (stepNum < _currentStepNum) {
            _updateCurrentStep(stepNum);
        }
    };
    this.previousStep = function () {
        if (_currentStepNum > 0) {
            _updateCurrentStep(_currentStepNum - 1);
        }
    };
    this.nextStep = function () {
        if (_wizard && !_.isEmpty(_wizard.getSteps()) &&
            _currentStepNum < (_wizard.getSteps().length - 1)) {
            _updateCurrentStep(_currentStepNum + 1);
        }
    };
}])
;
