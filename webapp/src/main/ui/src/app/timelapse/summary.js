angular.module('stealth.timelapse')

.service('summaryExploreMgr', [
'$timeout',
'toaster',
'ol3Map',
'stealth.core.geo.ol3.layers.GeoJsonVectorLayer',
'CONFIG',
function ($timeout, toaster, ol3Map, GeoJsonVectorLayer, CONFIG) {
    var self = this;
    this.toggleSummaryLayer = function (layer) {
        if (_.isUndefined(layer.mapLayerId) || _.isNull(layer.mapLayerId)) {
            var summaryLayer = new GeoJsonVectorLayer(layer.Title);
            layer.summaryLayer = summaryLayer;
            layer.mapLayerId = summaryLayer.id;
            layer.viewState.isOnMap = true;
            var ol3Layer = summaryLayer.getOl3Layer();
            layer.viewState.toggledOn = ol3Layer.getVisible();
            summaryLayer.styleDirectiveScope.styleVars.iconClass = 'fa fa-fw fa-lg fa-clock-o';
            summaryLayer.styleDirectiveScope.removeLayer = function () {
                self.removeSummaryLayer(layer);
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

    this.removeSummaryLayer = function (layer) {
        if (layer.viewState.isOnMap) {
            self.toggleSummaryLayer(layer);
        }
        _.pull(layer.layerThisBelongsTo.summaries, layer);
    };

    this.workspaces = {};

    this.summaryQuery = function (name, record, capability) {
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

        var layer = _.find(_.flatten(_.values(self.workspaces)),
            {Name: query.layerData.currentLayer.name});
        if (layer) {
            query.layerData.currentLayer.KeywordConfig = layer.KeywordConfig;

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
            self.toggleSummaryLayer(summary);
        } else {
            toaster.error('Summary Error', query.layerData.currentLayer.name + ' not found.');
        }
    };

    this.searchActiveSummaryLayers = function (coord, res) {
        var gsLayers = _.uniq(_.flatten(_.map(self.workspaces, function (layers) {
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
}])
;
