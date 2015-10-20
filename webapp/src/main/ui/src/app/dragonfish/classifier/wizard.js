/**
 * Define a wizard to let a user run a classifier.
 */
angular.module('stealth.dragonfish.classifier.wizard', [
    'stealth.dragonfish',
    'stealth.dragonfish.classifier.imageMetadata',
    'stealth.dragonfish.classifier.runner',
    'stealth.timelapse.wizard.bounds'
])

/**
 * Create the scope associated with a wizard, for use in things like templates and such.
 */
.service('stealth.dragonfish.classifier.wizard.scope', [
'$log',
'$rootScope',
'ol3Map',
'stealth.core.utils.WidgetDef',
'stealth.dragonfish.Constant',
'stealth.dragonfish.classifier.service',
'stealth.dragonfish.classifier.imageMetadata.service',
'stealth.dragonfish.classifier.runner.Constant',
'stealth.dragonfish.classifier.runner.QueryParams',
function ($log, $rootScope, ol3Map, WidgetDef, DF, classifierService, imageMetadataService, RUN, QueryParams) {
    var _creations = 0;

    this.create = function () {
        var wizardScope = $rootScope.$new();
        wizardScope.RUN = RUN;
        wizardScope.query = new QueryParams('Classifier Application ' + (_creations + 1));
        // wizardScope.imgMeta.errMsg should be either a string or undefined
        wizardScope.imgMeta = {
            resolvedMetadata: null,
            isLoading: false
        };
        wizardScope.drawBoundsWidgetDef = new WidgetDef('st-df-wiz-bounds', wizardScope);
        wizardScope.$watch('query.classifier', function () {
            if (wizardScope.query.isNonImageSpace()) {
                wizardScope.searchByGeoTime();
            }
            if (wizardScope.query.hasSingleLabel()) {
                wizardScope.query.classifierLabel = wizardScope.query.classifier.labels[0];
            }
        });
        wizardScope.searchByImageId = function () {
            wizardScope.query.searchBy = RUN.imageId;
            // if geomFeatureOverlay is set, remove it from the map (STEALTH-461)
            // if imageFeatureOverlay is set, add it to the map and zoom to there
            if (wizardScope.imageFeatureOverlay) {
                wizardScope.imageFeatureOverlay.addToMap();
                ol3Map.fit(wizardScope.imgMeta.resolvedMetadata.polygon);
            }
        };
        wizardScope.searchByGeoTime = function () {
            wizardScope.query.searchBy = RUN.geoTime;
            // if imageFeatureOverlay is set, remove it from the map
            if (wizardScope.imageFeatureOverlay) {
                wizardScope.imageFeatureOverlay.removeFromMap();
            }
            // if geomFeatureOverlay is set, add it to the map and zoom to there (STEALTH-461)
        };
        wizardScope.lookupImgMeta = function () {
            if (wizardScope.imageFeatureOverlay) {
                wizardScope.imageFeatureOverlay.removeFromMap();
                delete wizardScope.imageFeatureOverlay;
            }
            if (wizardScope.query.imageId) {
                wizardScope.imgMeta.isLoading = true; // flag for spinner
                imageMetadataService.lookupImgMeta(wizardScope.query.imageId)
                    .then(function (imageMetadata) {
                        if (imageMetadata && imageMetadata.polygon) {
                            wizardScope.imageFeatureOverlay = imageMetadataService.drawImageMetadata(imageMetadata.polygon);
                        }
                        wizardScope.imgMeta.isLoading = false;
                        wizardScope.imgMeta.resolvedMetadata = imageMetadata;
                        delete wizardScope.imgMeta.errMsg;
                    }, function (reason) {
                        wizardScope.imgMeta.isLoading = false;
                        wizardScope.imgMeta.resolvedMetadata = null;
                        wizardScope.imgMeta.errMsg = 'Image not found';
                        $log.warn(reason);
                    });
            } else {
                wizardScope.imgMeta.resolvedMetadata = null;
                wizardScope.imgMeta.isLoading = false;
                delete wizardScope.imgMeta.errMsg;
            }
        };
        wizardScope.pickClassifier = function (classifier) {
            wizardScope.query.classifier = classifier;
            delete wizardScope.query.classifierLabel;
        };
        wizardScope.spaceIcon = {};
        wizardScope.spaceIcon[DF.space.imagery] = 'fa-file-image-o';
        wizardScope.spaceIcon[DF.space.sigint] = 'fa-rss';
        wizardScope.spaceIcon[DF.space.fusion] = 'fa-sun-o';
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
                        if (scope.imageFeatureOverlay) {
                            scope.imageFeatureOverlay.removeFromMap();
                        }
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
