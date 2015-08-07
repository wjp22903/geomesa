angular.module('stealth.dcm.geo', [
    'stealth.dcm.wizard'
])

.run([
'$log',
'$rootScope',
'ol3Map',
'owsLayers',
'categoryManager',
'dcmQueryService',
'dcmWizard',
'threatSurfaceWizard',
'stealth.core.geo.ol3.manager.Category',
'stealth.core.utils.WidgetDef',
'stealth.core.geo.ol3.layers.WmsLayer',
'toastr',
function ($log, $rootScope,
          ol3Map, owsLayers, catMgr,
          dcmQueryService, dcmWizard, threatSurfaceWizard,
          Category, WidgetDef, WmsLayer,
          toastr) {
    var tag = 'stealth.dcm.geo: ';
    $log.debug(tag + 'run called');
    var scope = $rootScope.$new();

    scope.layers = [];
    scope.workspaces = {};

    scope.removeLayer = function (layer) {
        if (layer.viewState.toggledOn) {
            scope.toggleVisibility(layer);
        }
        _.pull(scope.layers, layer);
        ol3Map.removeLayerById(layer.mapLayerId);
    };

    scope.zoomToLayer = function (layer) {
        ol3Map.fit(layer.EX_GeographicBoundingBox);
    };

    scope.toggleVisibility = function (layer) {
        var mapLayer = ol3Map.getLayerById(layer.mapLayerId);
        var ol3Layer = mapLayer.getOl3Layer();
        ol3Layer.setVisible(!ol3Layer.getVisible());
        layer.viewState.toggledOn = !layer.viewState.toggledOn;
    };

    scope.launchDcmWizard = function () {
        scope.isWizardInProgress = true;
        dcmWizard.launch();
    };

    scope.launchThreatSurfaceWizard = function () {
        scope.isWizardInProgress = true;
        threatSurfaceWizard.launch();
    };

    scope.addThreatSurfaces = function (threatSurfaces) {
        threatSurfaces.forEach(function (threatSurface) {
            var match = _.find(scope.layers, function (l) {
                return l.Name === threatSurface.Name;
            });
            if (!match) {
                var layer = _.cloneDeep(threatSurface);
                layer.viewState = {
                    isOnMap: false,
                    toggledOn: false,
                    isLoading: false,
                    lastOpacity: 1
                };

                var requestParams = {
                    LAYERS: layer.Name,
                    cql_filter: null
                };

                var options = {
                    name: layer.Name,
                    layerThisBelongsTo: layer,
                    requestParams: requestParams,
                    queryable: true,
                    opacity: 1,
                    zIndexHint: -5,
                    isTiled: false
                };

                var wmsLayer = new WmsLayer(options);
                var ol3Layer = wmsLayer.getOl3Layer();

                layer.mapLayerId = wmsLayer.id;
                layer.viewState.isOnMap = true;
                layer.viewState.toggledOn = ol3Layer.getVisible();
                layer.OriginalTitle = angular.copy(layer.Title);
                layer.editTitle = false;
                layer.metadata.date = moment.utc(layer.metadata.date._d);

                ol3Map.addLayer(wmsLayer);
                scope.layers.push(layer);
            } else {
                toastr.error("Spatial Prediction already added to map.");
            }
        });
    };

    scope.editTitle = function (layer) {
        if (!layer.viewState.isLoading) {
            layer.editTitle = !layer.editTitle;
            if (layer.Title.length === 0) {
                layer.Title = angular.copy(layer.OriginalTitle);
            }
        }
    };

    scope.runDcmQuery = function (prediction) {
        var storeTitle = prediction.name;
        var tempLayer = {
            Name: prediction.workspace.name + ":" + storeTitle,
            Title: storeTitle,
            viewState: {
                isLoading: true
            }
        };
        scope.layers.push(tempLayer);
        scope.tempLayer = tempLayer;
        dcmQueryService.doDcmQuery({
            geometry: prediction.geometry,
            predictiveFeatures: prediction.predictiveFeatures,
            predictiveCoverages: prediction.predictiveCoverages,
            events: prediction.events[0],
            width: prediction.width,
            height: prediction.height,
            sampleRatio: prediction.sampleRatio,
            CRS: prediction.CRS,
            featureSelection: prediction.featureSelection,
            outputType: prediction.outputType,
            workspace: prediction.workspace,
            srsHandling: prediction.srsHandling,
            keywords: prediction.keywords,
            title: storeTitle,
            description: prediction.description,
            bounds: prediction.bounds
        }).then(function (output) {
            owsLayers.getLayers(['dcm', 'prediction'], true)
                .then(function (layers) {
                    $log.debug('owsLayers.getLayers()');
                    var predictionLayer = _.find(layers, function (layer) {
                        return layer.Name === output;
                    });
                    var layer = _.cloneDeep(predictionLayer);
                    layer.viewState = {
                        isOnMap: false,
                        toggledOn: false,
                        isLoading: false,
                        lastOpacity: 1
                    };

                    var requestParams = {
                        LAYERS: output,
                        cql_filter: null
                    };

                    var options = {
                        name: output,
                        layerThisBelongsTo: layer,
                        requestParams: requestParams,
                        queryable: true,
                        opacity: 1,
                        zIndexHint: 10,
                        isTiled: false
                    };

                    var wmsLayer = new WmsLayer(options);
                    var ol3Layer = wmsLayer.getOl3Layer();

                    layer.mapLayerId = wmsLayer.id;
                    layer.viewState.isOnMap = true;
                    layer.viewState.toggledOn = ol3Layer.getVisible();
                    layer.editTitle = false;
                    layer.OriginalTitle = angular.copy(layer.Title);
                    layer.metadata = angular.fromJson(layer.Abstract);
                    layer.Abstract = angular.fromJson(layer.Abstract).description;
                    layer.metadata.date = moment.utc(layer.metadata.date);
                    layer.showMetadata = false;

                    ol3Map.addLayer(wmsLayer);
                    var tempLayer = scope.layers.filter(function (l) {
                        return layer.Name === l.Name;
                    });
                    var tempLayerIdx = scope.layers.indexOf(tempLayer[0]);
                    scope.layers.splice(tempLayerIdx, tempLayerIdx + 1);
                    scope.layers.push(layer);
                    $rootScope.$emit('updateRouteAnalysisLayers');
                });
        }, function (reason) {
            var removeLayerIdx = scope.layers.indexOf(scope.tempLayer);
            scope.layers.splice(removeLayerIdx, removeLayerIdx + 1);
            toastr.error(reason);
        });
    };

    dcmWizard.setCategoryScope(scope);
    threatSurfaceWizard.setCategoryScope(scope);

    var widgetDef = new WidgetDef('st-dcm-geo-category', scope);
    var category = new Category(2, 'Spatial Predictions', 'fa-line-chart', widgetDef, null, true);
    catMgr.addCategory(1, category);
}])

.directive('stDcmGeoCategory', [
'$log',
function ($log) {
    var tag = 'stealth.dcm.geo.stDcmGeoCategory: ';
    $log.debug(tag + 'directive defined');
    return {
        templateUrl: 'dcm/geo/category.tpl.html'
    };
}])

;
