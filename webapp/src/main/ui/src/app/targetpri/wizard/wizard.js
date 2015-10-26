angular.module('stealth.targetpri.wizard', [
    'stealth.core.geo.ol3.map',
    'stealth.core.startmenu',
    'stealth.core.utils',
    'stealth.core.wizard',
    'stealth.targetpri.wizard.route',
    'stealth.targetpri.wizard.sites',
    'stealth.targetpri.wizard.track'
])

.constant('stealth.targetpri.wizard.TargetpriCookies', {
    time: 'targetpri.wizard.time',
    proxm: 'targetpri.wizard.proximityMeters',
    weights: 'targetpri.wizard.weights',
    icon: 'fa-crosshairs'
})

.run([
'$rootScope',
'startMenuManager',
'wizardManager',
'stealth.core.wizard.Wizard',
'stealth.core.wizard.Step',
'stealth.core.utils.WidgetDef',
'stealth.targetpri.wizard.route.routeTpWizFactory',
'stealth.targetpri.wizard.sites.sitesTpWizFactory',
'stealth.targetpri.wizard.track.trackTpWizFactory',
'stealth.targetpri.wizard.tpWizHelper',
'stealth.targetpri.wizard.TargetpriCookies',
function ($rootScope, startMenuManager, wizardManager, Wizard, Step,
    WidgetDef, routeWizFac, sitesWizFac, trackWizFac, tpWizHelper, TP) {
    var _idSeq = {'sites': 1, 'route': 1, 'track': 1};
    var launchWizard = function () {
        var wizardScope = $rootScope.$new();
        angular.extend(wizardScope, {
            name: 'Target ID ',
            type: 'sites',
            source: 'drawing',
            datasources: []
        });
        wizardManager.launchWizard(
            new Wizard('Target Identification', TP.icon, 'fa-ellipsis-h', [
                new Step('Select input type', new WidgetDef('st-tp-wiz-type', wizardScope), null, true,
                    function (stepNum) {
                        this.setEndIconClass('fa-ellipsis-h');
                        this.truncateSteps(stepNum);
                    },
                    function (success) {
                        if (wizardScope.geoFeature) {
                            wizardScope.trackInfo = null;
                            wizardScope.routeInfo = null;
                            wizardScope.sitesInfo = null;
                            wizardScope.geoFeature = null;
                        }
                        if (success) {
                            wizardScope.name = 'Target ID ' + wizardScope.type + ' ' + _idSeq[wizardScope.type]++;
                            switch (wizardScope.type) {
                                case 'sites':
                                    this.appendWizard(tpWizHelper.createSourceWiz(wizardScope, sitesWizFac.createDrawWiz, sitesWizFac.createEndWiz));
                                    break;
                                case 'route':
                                    this.appendWizard(tpWizHelper.createSourceWiz(wizardScope, routeWizFac.createDrawWiz, routeWizFac.createEndWiz));
                                    break;
                                case 'track':
                                    this.appendWizard(tpWizHelper.createSourceWiz(wizardScope, trackWizFac.createDrawWiz, trackWizFac.createEndWiz));
                                    break;
                            }
                        }
                    },
                    true
                )
            ], wizardScope)
        );
    };
    startMenuManager.addButton('Target Identification', TP.icon, launchWizard);
}])

.service('stealth.targetpri.wizard.tpWizHelper', [
'$timeout',
'stealth.core.wizard.Wizard',
'stealth.core.wizard.Step',
'stealth.core.utils.WidgetDef',
function ($timeout, Wizard, Step, WidgetDef) {
    this.createSourceWiz = function (wizardScope, createDrawWiz, createEndWiz) {
        return new Wizard(null, null, 'fa-ellipsis-h', [
            new Step('Select ' + wizardScope.type + ' source', new WidgetDef('st-tp-wiz-source', wizardScope), null, true,
                function (stepNum) {
                    this.setEndIconClass('fa-ellipsis-h');
                    this.truncateSteps(stepNum);
                },
                function (success) {
                    if (success) {
                        switch (wizardScope.source) {
                            case 'server':
                                // TODO: define and implement getting track off server layer
                                break;
                            case 'file':
                            case 'drawing':
                                this.appendWizard(createDrawWiz(wizardScope));
                                break;
                        }
                        this.appendWizard(createEndWiz(wizardScope));
                    }
                },
                true
            )
        ]);
    };
    // return an object that can be merged into scope to provide common
    // draw helping functions
    this.drawCommon = function (scope, fileInput) {
        return {
            erase: function () {
                $timeout(function () {
                    scope.geoFeature = null;
                    scope.trackInfo = null;
                    scope.routeInfo = null;
                    if (scope.sitesInfo) {
                        scope.sitesInfo.pdFeatures = null;
                        scope.sitesInfo.nameCounter = 1;
                    }
                    scope.featureOverlay.getFeatures().clear();
                });
            },
            upload: function () {
                $timeout(function () {
                    fileInput.click();
                });
            }
        };
    };
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
