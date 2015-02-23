angular.module('stealth.timelapse', [
    'stealth.core.geo.ol3.map',
    'stealth.core.interaction',
    'stealth.timelapse.geo',
    'stealth.timelapse.controls',
    'stealth.timelapse.wizard'
])

.run([
'$log',
'tlLayerManager',
function ($log, tlLayerManager) {
    tlLayerManager.start();
    $log.debug('stealth.timelapse: plugin loaded');
}])

.service('tlLayerManager', [
'$log',
'$rootScope',
'$compile',
'$templateCache',
'$timeout',
'toaster',
'mapClickService',
'ol3Map',
'tlControlsManager',
'stealth.timelapse.geo.ol3.layers.HistoricalLayer',
'stealth.core.geo.ol3.layers.GeoJsonVectorLayer',
'elementAppender',
'CONFIG',
function ($log, $rootScope, $compile, $templateCache, $timeout, toaster,
          mapClickService, ol3Map, controlsMgr,
          HistoricalLayer, GeoJsonVectorLayer, elementAppender, CONFIG) {
    $log.debug('stealth.timelapse.tlLayerManager: service started');
    var live, historical;
    function registerLayers () {
        historical = new HistoricalLayer('Historical');
        ol3Map.addLayer(historical);
    }

    var timeMillis = null;
    var windowMillis = null;
    function registerControlsListeners() {
        controlsMgr.registerDtgListener(function (millis) {
            timeMillis = millis;
            historical.redraw(timeMillis, windowMillis);
        });

        controlsMgr.registerWindowListener(function (millis) {
            windowMillis = millis;
            historical.redraw(timeMillis, windowMillis);
        });
    }

    this.start = function () {
        registerLayers();
        elementAppender.append('.primaryDisplay', 'timelapse/controls/controlsPanel.tpl.html', $rootScope.$new());
        registerControlsListeners();
        mapClickService.registerSearchable(function (coord, res) {
            return historical.searchActiveStores(coord, res);
        });
        mapClickService.registerSearchable(function (coord, res) {
            return summaryExploreMgr.searchActiveSummaryLayers(coord, res);
        });
    };

    this.getHistoricalLayer = function () {
        return historical;
    };

    var summaryExploreMgr = {};

    summaryExploreMgr.toggleSummaryLayer = function (layer) {
        if (_.isUndefined(layer.mapLayerId) || _.isNull(layer.mapLayerId)) {
            var summaryLayer = new GeoJsonVectorLayer(layer.Title);
            summaryLayer.setSummaryQueryCallback(summaryExploreMgr.summaryQuery);
            layer.summaryLayer = summaryLayer;
            layer.mapLayerId = summaryLayer.id;
            layer.viewState.isOnMap = true;
            var ol3Layer = summaryLayer.getOl3Layer();
            layer.viewState.toggledOn = ol3Layer.getVisible();
            summaryLayer.styleDirectiveScope.styleVars.iconClass = 'fa fa-fw fa-lg fa-clock-o';
            summaryLayer.styleDirectiveScope.removeLayer = function () {
                summaryExploreMgr.removeSummaryLayer(layer);
            };
            ol3Map.addLayer(summaryLayer);

            summaryLayer.launchQuery(layer.query);

            // Update viewState on layer visibility change.
            ol3Layer.on('change:visible', function () {
                $timeout(function () {
                    summaryLayer.getViewState().toggledOn = ol3Layer.getVisible();
                });
            });
        } else {
            var l = ol3Map.getLayerById(layer.mapLayerId);
            ol3Map.removeLayerById(layer.mapLayerId);
            delete layer.mapLayerId;
            delete layer.summaryLayer;
            layer.viewState.isOnMap = false;
        }
    };

    summaryExploreMgr.removeSummaryLayer = function (layer) {
        if (layer.viewState.isOnMap) {
            summaryExploreMgr.toggleSummaryLayer(layer);
        }
        _.pull(layer.layerThisBelongsTo.summaries, layer);
    };

    summaryExploreMgr.workspaces = {};

    summaryExploreMgr.summaryQuery = function (name, record, capability) {
        var query = {
            layerData: {
                currentLayer: {
                    name: capability['layerName'],
                    prefix: capability['layerName'].split(':')[0],
                    title: 'Summary: ' + name + '/' + (record[capability['trkIdField']] || record['frHex']),
                    trkIdField: (capability['trkIdField'] || 'thresherId'),
                    trkId: (record[capability['trkIdField']] || '47ef7f71-5a9b-4b8b-87cc-db4bbe9beca7'),
                    error: null
                }
            },
            serverData: {
                currentGeoserverUrl: CONFIG.geoserver.defaultUrl,
                error: null
            },
            params: {
                geomField: {
                    name: 'geom'
                }
            }
        };

        var summaryLayers = _.map(summaryExploreMgr.workspaces, function (layers) {
            return _.find(layers, {Name: query.layerData.currentLayer.name});
        });
        if (!_.isEmpty(summaryLayers)) {

            // There really should be only one summary layer for a given time-lapse layer.
            // Although, one summary layer could belong to more than one summary workspace.
            var layer = _.uniq(summaryLayers)[0];
            if (layer) {
                query.layerData.currentLayer.KeywordList = layer.KeywordList;

                var summary = {
                    layerThisBelongsTo: layer,
                    Name: query.layerData.currentLayer.name,
                    Title: query.layerData.currentLayer.title,
                    viewState: {
                        isOnMap: false,
                        toggledOn: false,
                        isLoading: false,
                        isExpanded: true,
                        isRemovable: true
                    },
                    query: query
                };

                layer.summaries.push(summary);
                summaryExploreMgr.toggleSummaryLayer(summary);
            } else {
                toaster.error('Summary Error', query.layerData.currentLayer.name + ' not found.');
            }
        }
    };

    summaryExploreMgr.searchActiveSummaryLayers = function (coord, res) {
        var gsLayers = _.uniq(_.flatten(_.map(summaryExploreMgr.workspaces, function (layers) {
            return layers;
        })));
        var active = _.map(gsLayers, function (gsLayer) {
            var activeSummaryObjects = _.filter(gsLayer.summaries, function (summary) {
                return summary.viewState.isOnMap && summary.viewState.toggledOn;
            });
            var activeSummaryLayers = _.map(activeSummaryObjects, function (obj) {
                return obj.summaryLayer;
            });
            return activeSummaryLayers;
        });
        var activeGeoJsonVectorLayers = _.flatten(active);
        return _.map(activeGeoJsonVectorLayers, function (l) {
            return l.searchPoint(coord, res);
        });
    };

    this.getSummaryExploreManager = function () {
        return summaryExploreMgr;
    };
}])
;
