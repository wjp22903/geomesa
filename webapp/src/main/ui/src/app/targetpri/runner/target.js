angular.module('stealth.targetpri.runner', [
    'stealth.core.geo.ol3.format',
    'stealth.targetpri.results',
    'stealth.core.geo.ol3.geodetics'
])

.constant('stealth.targetpri.runner.TargetType', {
    sites: 'Sites',
    route: 'Route',
    track: 'Track'
})

.run([
'$rootScope',
'stealth.targetpri.runner.rankRunner',
function ($rootScope, rankRunner) {
    $rootScope.$on('targetpri:request', function (evt, req) { //eslint-disable-line no-unused-vars
        rankRunner.run(req);
    });
}])

.service('stealth.targetpri.runner.rankRunner', [
'$rootScope',
'sidebarManager',
'stealth.core.utils.WidgetDef',
'stealth.targetpri.runner.rankService',
'stealth.core.geo.ol3.format.GeoJson',
'stealth.core.geo.ol3.layers.MapLayer',
'stealth.targetpri.geo.ol3.layers.TargetPriResultLayer',
'stealth.targetpri.results.Category',
'stealth.targetpri.runner.TargetType',
'stealth.targetpri.runner.targetRankHelper',
'stealth.targetpri.wizard.TargetpriCookies',
'categoryManager',
'cqlHelper',
function ($rootScope, sidebarManager, WidgetDef, rankService, GeoJson, MapLayer, TargetPriResultLayer,
            Category, TT, targetRankHelper, TP, catMgr, cqlHelper) {
    var geoJsonFormat = new GeoJson();
    this.run = function (req) {
        var category = catMgr.addCategory(2, new Category(req.name, function () {
            sidebarManager.removeButton(buttonId);
            scope.$destroy();
        }));
        var targetName = req.targetType + ' for [' + req.name + ']';
        var layer = new MapLayer(targetName, targetRankHelper[req.targetType].formatFeature(req.targetFeature), false);
        layer.viewState = {};
        category.addLayer(layer);
        var track = {},
            geoJson,
            pdFeaturesArr = [];
        if (req.targetType === TT.track) {
            track = {startDtg: 0, endDtg: 0};
            pdFeaturesArr = req.targetFeature.get('pointData').features;
            _.each(pdFeaturesArr, function (pdFeature, index) {
                if (index === 0) {
                    track.startDtg = pdFeature.get('dtg');
                } else if (index === (pdFeaturesArr.length - 1)) {
                    track.endDtg = pdFeature.get('dtg');
                }
                pdFeature.set('dtg', pdFeature.get('dtg').toISOString());
            });
            geoJson = geoJsonFormat.writeFeatures(req.targetFeature.get('pointData').features);
            req.startDtg = moment(track.startDtg);
            req.endDtg = moment(track.endDtg);
        } else if (req.targetType === TT.route) {
            // OL3 bug workaround:
            geoJson = JSON.stringify(geoJsonFormat.writeFeaturesObject([req.targetFeature]));
        } else if (req.targetType === TT.sites) {
            geoJson = geoJsonFormat.writeFeatures(req.targetFeature.getArray());
        }
        var dataSourcesAndPromises = _.map(req.dataSources, function (dataSource) {
            var filter = cqlHelper.buildDtgFilter(dataSource.fieldNames.dtg, req.startDtg, req.endDtg);
            var promise = targetRankHelper[req.targetType].doGeoJsonQuery({
                inputFeatures: geoJson,
                dataLayer: dataSource.Name,
                dataLayerFilter: filter,
                bufferMeters: req.proximityMeters
            }).then(function (layerName) {
                var layer = new TargetPriResultLayer({
                    name: dataSource.Title + ' for [' + req.name + ']',
                    requestParams: {
                        LAYERS: layerName,
                        STYLES: 'stealth_dataPoints',
                        ENV: 'color:BEBE40;opacity:0.6;size:10'
                    },
                    queryable: true
                }, req, dataSource);
                layer.viewState = {};
                dataSource.proximityLayer = category.addLayer(layer);
                return layerName;
            });
            return targetRankHelper[req.targetType].datasourceSupport(dataSource, filter, promise, track);
        });
        var promise = rankService.doGeoJsonTargetPriRank(req.rankTemplate, dataSourcesAndPromises,
            targetRankHelper[req.targetType].targetPriRankArg(req, geoJson), targetRankHelper[req.targetType].parseDatasource())
            .then(function (response) {
                rankService.colorPoints(response);
                return response.combined;
            });

        var scope = $rootScope.$new();
        scope.promise = promise;
        scope.request = req;

        //Need some scope placeholders to link the results with the pager
        scope.response = null;
        scope.paging = null;

        var buttonId = sidebarManager.toggleButton(
            sidebarManager.addButton(req.name, TP.icon, 500,
                new WidgetDef('st-target-pri-results', scope),
                new WidgetDef('st-pager', scope, "paging='paging' records='response.results'"), false, function () {
                    catMgr.removeCategory(category.id);
                    scope.$destroy();
                }),
            true);
    };
}])

.service('stealth.targetpri.runner.targetRankHelper', [
'ol3Styles',
'stealth.core.geo.query.queryHelperService',
'stealth.targetpri.runner.TargetType',
function (ol3Styles, queryHelperService, TT) {
    this.parent = {
        id: 'parent',
        doGeoJsonQuery: function (arg) {
            return queryHelperService.doGeoJsonProximityQuery(arg);
        },
        formatFeature: function (targetFeature) {
            return new ol.layer.Vector({
                source: new ol.source.Vector({
                    features: [targetFeature]
                }),
                style: ol3Styles.getLineStyle(3, '#CC0099')
            });
        },
        datasourceSupport: function (dataSource, filter, promise) {
            return {
                dataSource: dataSource,
                filter: filter,
                proximityPromise: promise
            };
        },
        targetPriRankArg: function (req, geoJson) {
            return {
                inputGeoJson: geoJson,
                bufferMeters: req.proximityMeters
            };
        },
        parseDatasource: ''
    };
    this[TT.sites] = _.merge({}, this.parent, {
        id: TT.sites,
        formatFeature: function (targetFeature) {
            return new ol.layer.Vector({
                source: new ol.source.Vector({
                    features: targetFeature
                }),
                style: ol3Styles.getPointStyle(3, '#CC0099')
            });
        },
        targetPriRankArg: function (req, geoJson) {
            return {
                inputGeoJson: geoJson,
                bufferMeters: req.proximityMeters,
                uniquenessWeight: req.weights.uniquenessWeight,
                durationWeight: req.weights.durationWeight,
                prevalenceWeight: req.weights.prevalenceWeight,
                proximityWeight: req.weights.proximityWeight,
                targetType: req.targetType
            };
        },
        parseDatasource: function () {
            return function (dataSource) {
                return {
                    obsKeyField: dataSource.dataSource.fieldNames.id,
                    obsTimeUpField: dataSource.dataSource.fieldNames.dtg,
                    obsTimeDownField: dataSource.dataSource.fieldNames.dtg
                };
            };
        }
    });
    this[TT.route] = _.merge({}, this.parent, {
        id: TT.route,
        parseDatasource: function () {
            return function (dataSource) {
                return {
                    dataLayer: dataSource.dataSource.Name,
                    dataLayerFilter: dataSource.filter,
                    inputIdField: dataSource.dataSource.fieldNames.id,
                    inputDtgField: dataSource.dataSource.fieldNames.dtg
                };
            };
        }
    });
    this[TT.track] = _.merge({}, this.parent, {
        id: TT.track,
        doGeoJsonQuery: function (arg) {
            return queryHelperService.doGeoJsonTubeQuery(arg);
        },
        datasourceSupport: function (dataSource, filter, promise, track) {
            return {
                dataSource: dataSource,
                filter: filter,
                proximityPromise: promise,
                dtgs: {
                    startDtg: track.startDtg.toISOString(),
                    endDtg: track.endDtg.toISOString()
                }
            };
        },
        parseDatasource: function () {
            return function (dataSource) {
                return {// returned object
                    dataLayer: dataSource.dataSource.Name,
                    startDtg: dataSource.dtgs.startDtg,
                    endDtg: dataSource.dtgs.endDtg,
                    dataLayerFilter: dataSource.filter,
                    inputIdField: dataSource.dataSource.fieldNames.id,
                    inputDtgField: dataSource.dataSource.fieldNames.dtg
                };
            };
        }
    });
}])
;
