angular.module('stealth.dcm.geo', [
    'stealth.dcm.wizard'
])

.run([
'$log',
'$rootScope',
'$timeout',
'ol3Map',
'wms',
'wfs',
'owsLayers',
'cqlHelper',
'categoryManager',
'dcmQueryService',
'dcmWizard',
'threatSurfaceWizard',
'stealth.core.geo.ol3.manager.Category',
'stealth.core.utils.WidgetDef',
'stealth.core.geo.ol3.layers.MapLayer',
'stealth.core.geo.ol3.layers.WmsLayer',
'CONFIG',
'toastr',
function ($log, $rootScope, $timeout,
          ol3Map, wms, wfs, owsLayers, cqlHelper, catMgr,
          dcmQueryService, dcmWizard, threatSurfaceWizard,
          Category, WidgetDef, MapLayer, WmsLayer,
          CONFIG, toastr) {
    var tag = 'stealth.dcm.geo: ';
    $log.debug(tag + 'run called');
    var scope = $rootScope.$new();
    var predictionPrefix = ['dcm', 'prediction'];

    scope.layers = [];
    scope.workspaces = {};
    scope.threatSurfaces = [];

    scope.removeLayer = function (layer) {
        if (layer.viewState.isOnMap) {
            scope.toggleVisibility(layer);
        }
        _.pull(scope.layers, layer);
        _.pull(scope.threatSurfaces, layer);
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

    scope.addThreatSurfaces = function(threatSurfaces) {
        threatSurfaces.forEach(function(threatSurface) {
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
                zIndexHint: 10,
                isTiled: false
            };

            var wmsLayer = new WmsLayer(options);
            var ol3Layer = wmsLayer.getOl3Layer();

            layer.mapLayerId = wmsLayer.id;
            layer.viewState.isOnMap = true;
            layer.viewState.toggledOn = ol3Layer.getVisible();
            layer.OriginalTitle = angular.copy(layer.Title);
            layer.editTitle = false;

            ol3Map.addLayer(wmsLayer);
            scope.threatSurfaces.push(layer);
        });

    };

    scope.editTitle = function(layer) {
        if (!layer.viewState.isLoading) {
            layer.editTitle = !layer.editTitle;
            if (layer.Title.length === 0) {
                layer.Title = angular.copy(layer.OriginalTitle);
            }
        }
    };

    scope.runDcmQuery = function(prediction) {
        var storeTitle = prediction.name ? prediction.name : dcmQueryService.getStoreName(prediction.predictiveFeatures, prediction.predictiveCoverages, prediction.events);
        var tempLayer = {
            Title: storeTitle,
            viewState: {
                isLoading: true
            }
        };
        scope.layers.push(tempLayer);
        var promise = dcmQueryService.doDcmQuery({
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
                console.log(output);
                owsLayers.getLayers(['dcm', 'prediction'], true)
                    .then(function (layers) {
                        $log.debug('owsLayers.getLayers()');
                        var predictionLayer = _.find(layers, function (layer) {
                            return layer.Name == output;
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

                        ol3Map.addLayer(wmsLayer);
                        var tempLayer = scope.layers.filter(function(l) {
                            return layer.Title.startsWith(l.Title);
                        });
                        var tempLayerIdx = scope.layers.indexOf(tempLayer[0]);
                        scope.layers.splice(tempLayerIdx, tempLayerIdx + 1);
                        scope.layers.push(layer);
                    });
            }, function (reason) {
                scope.layers.pop();
                toastr.error(reason);
            });
    };

    dcmWizard.setCategoryScope(scope);
    threatSurfaceWizard.setCategoryScope(scope);

    var widgetDef = new WidgetDef('st-dcm-geo-category', scope);
    var category = new Category(2, 'Spatial Predictions', 'fa-bar-chart', widgetDef, null, true);
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
