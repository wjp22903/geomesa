angular.module('stealth.activity.activityIndicator', [
    'stealth.common.imagery.imageryManager',
    'stealth.common.map.ol.map',
    'stealth.common.map.ol.draw.measure',
    'stealth.common.panes.centerPane',
    'stealth.common.panes.leftPane',
    'stealth.common.layermanager.openlayersManager',
    'stealth.ows.ows',
    'flexyLayout',
    'ui.bootstrap.buttons'
])

.config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/activityIndicator', {
        templateUrl: 'activity/activityIndicator.tpl.html'
    });
}])

.controller('ActivityIndicatorController', [
'$scope', '$rootScope', '$filter', '$interval', '$timeout', 'WFS', 'CONFIG',
function($scope, $rootScope, $filter, $interval, $timeout, WFS, CONFIG) {
    var parser = new OpenLayers.Format.GeoJSON();
    var now = moment(),
        someTimeAgo = now.clone().subtract(60, 'd');
    $scope.activityIndicator = {
        sites: [],
        siteList: {
            currentPage: 1,
            pageSize: 30,
            numberOfPages: function () {
                if ($scope.activityIndicator.sites) {
                    return Math.ceil($scope.activityIndicator.sites.length/$scope.activityIndicator.siteList.pageSize);
                }
                return 0;
            }
        },
        startDateOpen: false,
        endDateOpen: false,
        toggleDateOpen: function ($event, open) {
            $event.preventDefault();
            $event.stopPropagation();
            return !open;
        },
        startDateMoment: someTimeAgo,
        endDateMoment: now,
        startDate: someTimeAgo.toDate(),
        endDate: now.toDate(),
        selectedSiteName: '',
        isLeftPaneVisible: true,
        leftPaneView: 'sites',
        select: function (site, dtg) {
            $scope.activityIndicator.selectedSiteName = site.properties.site;
            $scope.activityIndicator.showTimeseries(site.properties.site, moment(dtg));
        },
        showTimeseriesContainer: false,
        showTimeseries: function (siteId, dtgMoment) {
            $scope.activityIndicator.showTimeseriesContainer = true;
            var container = document.getElementById('timeseries');
            _.each(container.childNodes, function (child) {
                container.removeChild(child);
            });

            var cql = "site='" + siteId + "'";
            if (dtgMoment && dtgMoment.isValid()) {
                cql += ' AND dtg BEFORE ' + dtgMoment.clone().add(7, 'd').toISOString();  //try to show a week past date
            }
            WFS.getFeature(CONFIG.activityIndicator.geoserverUrl, CONFIG.activityIndicator.timeseriesLayer, {
                outputFormat: 'application/json',
                cql_filter: cql,
                version: null
            }).then(function (response) {
                var data, viz, counts = [], alerts = [];
                _.each(response.data.features, function (feature) {
                    var date = moment(feature.properties.dtg);
                    counts.push({
                        id: feature.id,
                        x: date.toDate(),
                        y: feature.properties.count
                    });
                    if (feature.properties.isAlert) {
                        alerts.push({
                            id: feature.properties.alertId,
                            x: date.clone().subtract(24, 'h').toDate(),
                            x2: date.clone().add(24, 'h').toDate(),
                            y: feature.properties.count
                        });
                    }
                });

                data = [{key: 0, values: counts}, {key: 'alerts', values: alerts}];
                viz = sonic.viz('#timeseries', data)
                .addXAxis({
                    type: 'time',
                    label: {text: 'Date'}
                })
                .addYAxis({
                    label: {text: 'Count'}
                })
                .addLine({
                    seriesIndexes: [0],
                    stroke: '#CC0000',
                    sort: true,
                    tooltip: {type: 'global'}
                })
                .addOverlayBars({
                    seriesKeys: 'alerts',
                    tooltip: {type: 'global'}
                });
                viz.addCrosshair();
            }, function () {
                alert('WFS failed');
            });
        },
        newAlertIds: {},
        refreshAlerts: function () {
            WFS.getFeature(CONFIG.activityIndicator.geoserverUrl, CONFIG.activityIndicator.alertsLayer, {
                outputFormat: 'application/json',
                cql_filter: 'dtg BETWEEN ' + $scope.activityIndicator.startDateMoment.format('YYYY-MM-DD') +
                    ' AND ' + $scope.activityIndicator.endDateMoment.format('YYYY-MM-DD'),
                sortBy: 'dtg',
                version: null
            }).then(function (response) {
                var features = parser.read(response.data);
                $scope.activityIndicator.alertLayer.destroyFeatures();
                $scope.activityIndicator.alertLayer.addFeatures(features);
                var newList = response.data.features.reverse();
                var oldIds = _.pluck($scope.activityIndicator.sites, 'id');
                if (oldIds.length > 0) {
                    _.each(newList, function (alert) {
                        if (oldIds.indexOf(alert.id) === -1) {
                            $scope.activityIndicator.newAlertIds[alert.id] = true;
                            $timeout(function () {
                                delete $scope.activityIndicator.newAlertIds[alert.id];
                            }, 20000);
                        }
                    });
                }
                $scope.activityIndicator.sites = newList;
            }, function () {
                alert('WFS failed');
            });
        },
        highlightAlertOnMap: function (site) {
            $scope.activityIndicator.alertLayer.drawFeature(
                $scope.activityIndicator.alertLayer.getFeatureByFid(site.id),
                'select'
            );
        },
        unhighlightAlertOnMap: function (site) {
            $scope.activityIndicator.alertLayer.drawFeature(
                $scope.activityIndicator.alertLayer.getFeatureByFid(site.id),
                'default'
            );
        },
        autoRefresh: false,
        autoRefreshPromis: null,
        toggleAutoRefresh: function () {
            if ($scope.activityIndicator.autoRefresh && !$scope.activityIndicator.autoRefreshPromise) {
                $scope.activityIndicator.autoRefreshPromise = $interval(function () {
                    $scope.activityIndicator.refreshAlerts();
                }, 2500);
            } else {
                if ($scope.activityIndicator.autoRefreshPromise) {
                    $interval.cancel($scope.activityIndicator.autoRefreshPromise);
                    $scope.activityIndicator.autoRefreshPromise = null;
                }
            }
        },
        searchImagery: function (site, event) {
            if (event) {
                event.stopPropagation();
            }
            var startDate = moment(site.properties.dtg).clone().subtract(3, 'd').toDate();
            var endDate = moment(site.properties.dtg).clone().add(4, 'd').toDate();
            var noTime = new Date();
            noTime.setHours(0);
            noTime.setMinutes(0);
            noTime.setSeconds(0);
            $rootScope.$emit('PopulateImageryForm', {
                minLat: site.geometry.coordinates[1] - 0.01,
                minLon: site.geometry.coordinates[0] - 0.03,
                maxLat: site.geometry.coordinates[1] + 0.01,
                maxLon: site.geometry.coordinates[0] + 0.03,
                startDate: startDate,
                startTime: _.cloneDeep(noTime),
                endDate: endDate,
                endTime: _.cloneDeep(noTime),
                e: 5.7,
                f: 'VIS'
            });
            $scope.activityIndicator.leftPaneView = 'imagery';
            $scope.activityIndicator.showTimeseriesContainer = false;
        }
    };

    $rootScope.$on('$viewContentLoaded', function () {
        $scope.activityIndicator.alertLayer = new OpenLayers.Layer.Vector('Alerts', {
            permanent: true,
            styleMap: new OpenLayers.StyleMap(_.merge(_.cloneDeep(OpenLayers.Feature.Vector.style), {
                'default': {
                    fillColor: '#CC0000',
                    fillOpacity: 1,
                    strokeColor: '#550000'
                },
                select: {
                    fillColor: '#66CCCC',
                    fillOpacity: 1,
                    strokeColor: '#000000',
                    strokeWidth: 4,
                    graphicZIndex: 9999
                }
            })),
            rendererOptions: {zIndexing: true}
        });
    });
    $scope.$watch('activityIndicator.map', function () {
        if ($scope.activityIndicator.map) {
            $scope.activityIndicator.map.addLayer($scope.activityIndicator.alertLayer);
            $scope.activityIndicator.map.setLayerIndex($scope.activityIndicator.alertLayer,
                $scope.activityIndicator.map.layers.length - 1);
            $scope.activityIndicator.refreshAlerts();
        }
    });
    $scope.$watch('activityIndicator.startDate', function (newVal) {
        $scope.activityIndicator.startDateMoment = moment(newVal);
    });
    $scope.$watch('activityIndicator.endDate', function (newVal) {
        $scope.activityIndicator.endDateMoment = moment(newVal);
    });
    $scope.$on('$destroy', function () {
        $interval.cancel($scope.activityIndicator.autoRefreshPromise);
    });
}])
;
