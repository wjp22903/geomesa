/**
 * Define a wizard to let a user run a classifier.
 */
angular.module('stealth.dragonfish.classifier.wizard', [
    'stealth.dragonfish',
    'stealth.dragonfish.classifier.imageMetadata',
    'stealth.dragonfish.classifier.runner',
    'stealth.dragonfish.geo.category',
    'stealth.timelapse.wizard.bounds'
])
/**
 * Create the scope associated with a wizard, for use in things like templates and such.
 */
.service('stealth.dragonfish.classifier.wizard.scope', [
'$log',
'$rootScope',
'ol3Styles',
'ol3Map',
'stealth.core.geo.ol3.utils.geomHelper',
'stealth.core.geo.ol3.overlays.Vector',
'stealth.core.utils.WidgetDef',
'stealth.dragonfish.Constant',
'stealth.dragonfish.classifier.service',
'stealth.dragonfish.classifier.imageMetadata.service',
'stealth.dragonfish.classifier.runner.Constant',
'stealth.dragonfish.classifier.runner.QueryParams',
'stealth.dragonfish.geo.category.manager',
function ($log, $rootScope, ol3Styles, ol3Map, geomHelper, VectorOverlay, WidgetDef, DF, classifierService, imageMetadataService, RUN, QueryParams, dfCategoryMgr) {
    this.create = function () {
        var wizardScope = $rootScope.$new();
        wizardScope.RUN = RUN;
        wizardScope.query = new QueryParams();
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
            if (!wizardScope.query.isImageIdSource()) {
                if (!wizardScope.query.isNonImageSpace()) {
                    wizardScope.query.searchBy = RUN.imageId;
                }
                if (wizardScope.geomFeatureOverlay) {
                    wizardScope.geomFeatureOverlay.removeFromMap();
                }
                if (wizardScope.imageFeatureOverlay) {
                    wizardScope.imageFeatureOverlay.addToMap();
                    ol3Map.fit(wizardScope.imgMeta.resolvedMetadata.polygon);
                }
                if (wizardScope.query.tileLayer) {
                    dfCategoryMgr.addImageLayer(wizardScope.query.tileLayer);
                }
            }
        };
        wizardScope.searchByGeoTime = function () {
            if (!wizardScope.query.isGeomSource()) {
                wizardScope.query.searchBy = RUN.geoTime;
                if (wizardScope.imageFeatureOverlay) {
                    wizardScope.imageFeatureOverlay.removeFromMap();
                }
                if (wizardScope.geomFeatureOverlay) {
                    var polygon = geomHelper.polygonFromExtentParts(wizardScope.query.geom.minLon,
                                    wizardScope.query.geom.minLat,
                                    wizardScope.query.geom.maxLon,
                                    wizardScope.query.geom.maxLat);
                    wizardScope.geomFeatureOverlay.addToMap();
                    ol3Map.fit(polygon);
                }
                if (wizardScope.query.tileLayer) {
                    dfCategoryMgr.removeImageLayer(wizardScope.query.tileLayer);
                }
            }
        };
        wizardScope.lookupImgMeta = function () {
            if (wizardScope.imageFeatureOverlay) {
                wizardScope.imageFeatureOverlay.removeFromMap();
                delete wizardScope.imageFeatureOverlay;
            }
            if (wizardScope.query.tileLayer) {
                dfCategoryMgr.removeImageLayer(wizardScope.query.tileLayer);
                delete wizardScope.query.tileLayer;
            }
            if (wizardScope.query.imageId) {
                wizardScope.imgMeta.isLoading = true; // flag for spinner
                imageMetadataService.lookupImgMeta(wizardScope.query.imageId)
                    .then(function (imageMetadata) {
                        if (imageMetadata && imageMetadata.polygon) {
                            wizardScope.imageFeatureOverlay = imageMetadataService.drawImageMetadata(imageMetadata.polygon);
                        }
                        // Add DragonTilesLayer
                        wizardScope.query.tileLayer = dfCategoryMgr.addImageLayerFromImageId(imageMetadata.imageId);
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
        wizardScope.clearGeomBounds = function () {
            if (wizardScope.geomFeatureOverlay) {
                wizardScope.geomFeatureOverlay.removeFromMap();
                delete wizardScope.geomFeatureOverlay;
            }
        };
        wizardScope.checkAndSetBounds = function () {
            var geom = wizardScope.query.geom;
            wizardScope.query.checkAndSetBounds([geom.minLon, geom.minLat, geom.maxLon, geom.maxLat], false);
        };
        wizardScope.drawGeomBounds = function (geom) {
            var polygon = geomHelper.polygonFromExtentParts(geom.minLon, geom.minLat, geom.maxLon, geom.maxLat);
            var geomFeatureOverlay = new VectorOverlay({
                colors: [DF.polyColor],
                styleBuilder: function () {
                    return ol3Styles.getPolyStyle(1, DF.polyColor);
                }
            });
            geomFeatureOverlay.addFeature(new ol.Feature({geometry: polygon}));
            geomFeatureOverlay.addToMap();
            ol3Map.fit(polygon);
            return geomFeatureOverlay;
        };
        wizardScope.$watchGroup(['query.geom.minLat', 'query.geom.minLon', 'query.geom.maxLat', 'query.geom.maxLon'], function () {
            wizardScope.clearGeomBounds();
            wizardScope.geomFeatureOverlay = wizardScope.drawGeomBounds(wizardScope.query.geom);
            wizardScope.query.generateGeomName();
        });
        wizardScope.geomNameEdited = function () {
            wizardScope.query.geom.userSet = true;
            wizardScope.query.generateGeomName();
            wizardScope.checkAndSetBounds(); // call to get name saved into cookie
        };
        classifierService.getClassifiers()
            .then(function (classifiers) {
                wizardScope.classifiers = classifiers;
            });
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
'stealth.dragonfish.geo.category.manager',
function ($rootScope, wizardManager, Wizard, Step, WidgetDef, DF, ClassConstant, wizardScope, dfCategoryMgr) {
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
                        if (scope.geomFeatureOverlay) {
                            scope.geomFeatureOverlay.removeFromMap();
                        }
                        if (success) {
                            $rootScope.$emit(ClassConstant.applyEvent, scope.query);
                        } else if (scope.query.tileLayer) {
                            dfCategoryMgr.removeImageLayer(scope.query.tileLayer);
                        }
                        scope.$destroy();
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
