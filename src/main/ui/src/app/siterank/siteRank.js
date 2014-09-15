angular.module('stealth.siterank.siteRank', [
    'stealth.common.imagery.imageryManager',
    'stealth.common.proximity',
    'stealth.common.utils',
    'stealth.common.map.ol.map',
    'stealth.common.map.ol.popup.popup',
    'stealth.common.map.ol.draw.measure',
    'stealth.common.panes.centerPane',
    'stealth.common.panes.leftPane',
    'stealth.common.panes.centerTop',
    'stealth.common.panes.centerRight',
    'stealth.common.groupCheckbox',
    'stealth.common.layermanager.openlayersManager',
    'stealth.common.rank',
    'stealth.ows.ows',
    'flexyLayout',
    'ui.bootstrap.buttons'
])

    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/siteRank', {
            templateUrl: 'siterank/siteRank.tpl.html'
        });
    }])

    .controller('SiteRankController', [
    '$scope', '$rootScope', '$modal', '$filter', '$http', '$timeout', 'WFS', 'ProximityService', 'RankService', 'CONFIG', 'Utils',
    function($scope, $rootScope, $modal, $filter, $http, $timeout, WFS, ProximityService, RankService, CONFIG, Utils) {
        var now = new Date(),
            aWeekAgo = new Date(),
            noTime = new Date(),
            offset = moment().zone();
        now.setMinutes(now.getMinutes() + offset);
        aWeekAgo.setDate(now.getDate() - 7);
        aWeekAgo.setMinutes(aWeekAgo.getMinutes() + offset);
        noTime.setHours(0);
        noTime.setMinutes(0);

        $scope.siteRank = {
            targetList: {
                currentPage: 1,
                pageSize: 10,
                numberOfPages: function () {
                    if ($scope.siteRank.targets) {
                        return Math.ceil($scope.siteRank.targets.length/$scope.siteRank.targetList.pageSize);
                    }
                    return 0;
                }
            },
            isLeftPaneVisible: true,
            leftPaneView: 'analysis',
            targets: [],
            options: {
                startDate: aWeekAgo,
                startTime: _.cloneDeep(aWeekAgo),
                endDate: now,
                endTime: _.cloneDeep(now)
            },
            optionsForm: {
                startDateOpen: false,
                endDateOpen: false,
                toggleDateOpen: function ($event, open) {
                    $event.preventDefault();
                    $event.stopPropagation();
                    return !open;
                },
                clearStartDatetime: function () {
                    $scope.siteRank.options.startDate = null;
                    $scope.siteRank.options.startTime = _.cloneDeep(noTime);
                },
                clearEndDatetime: function () {
                    $scope.siteRank.options.endDate = null;
                    $scope.siteRank.options.endTime = _.cloneDeep(noTime);
                }
            },
            siteLayers: _.chain(_.keys(CONFIG.dataSources.sites))
                // Streamline the properties we are including.
                .map(function (layer) {
                    var parts = layer.split(':', 2);
                    return {
                        prefix: parts[0],
                        name: layer,
                        spatialQueryCount: null
                    };
                })
                // Build a map of workspaces
                .groupBy('prefix')
                // Only include the workspaces specified in the config.
                .pick(CONFIG.geoserver.workspaces.site)
                .value(),
            sites: [],
            siteList: {
                currentPage: 1,
                pageSize: 30,
                numberOfPages: function () {
                    if ($scope.siteRank.sites) {
                        return Math.ceil($scope.siteRank.sites.length/$scope.siteRank.siteList.pageSize);
                    }
                    return 0;
                },
                sendSelectedToTargetRank: function () {
                    alert('Coming Soon!');
                }
            },
            numSiteLayers: 0,
            matchDatasourceAndGeoserverWorkspace: function (layer) {
                return _.contains(_.keys(CONFIG.dataSources.targets), layer.name) && _.some(CONFIG.geoserver.workspaces.data, function (workspace) {
                    var str = workspace + ':';
                    return layer.name.substring(0, str.length) === str;
                });
            },
            removeTarget: function (targetToRemove) {
                $rootScope.$emit('RemoveMapLayers', targetToRemove.idValue + '@' + targetToRemove.layer.name);
                _.remove($scope.siteRank.targets, function (target) {
                    return _.isEqual(target, targetToRemove);
                });
            },
            updateNumSiteLayers: function (delay) {
                $timeout(function () {
                    $scope.siteRank.numSiteLayers = _.chain($scope.siteRank.siteLayers).values().flatten().reduce(function (count, layer) {
                        if (layer.isSelected) {
                            count++;
                        }
                        return count;
                    }, 0).value();
                }, delay);
            },
            doProximity: function (geoserverUrl, layerName, cql_filter) {
                var proxFn = ProximityService.doLayerProximity,
                    proxArg = {
                        style: 'stealth_tpInput_point',
                        geoserverUrl: geoserverUrl,
                        inputLayer: layerName,
                        inputLayerFilter: cql_filter,
                        dataLayerFilter: '1=1',
                        bufferMeters: $scope.siteRank.options.proximityMeters
                    };
                _.chain($scope.siteRank.siteLayers).values().flatten().filter(function (siteLayer) {
                    return siteLayer.isSelected;
                }).forEach(function (siteLayer) {
                    proxArg.dataLayer = siteLayer.name;
                    siteLayer.spatialQueryCount++;
                    proxFn(proxArg).then(function () {
                        siteLayer.spatialQueryCount--;
                    }, function () {
                        siteLayer.spatialQueryCount--;
                    });
                });
            },
            doRank: function () {
                delete $scope.siteRank.siteList.errorMessage;
                $scope.siteRank.siteList.currentPage = 1;
                $scope.siteRank.sites = [];
                $scope.siteRank.siteList.loadingSites = true;
                $scope.siteRank.leftPaneView = 'sites'; //switch tabs
                RankService.getSiteRanksForTargets(_.pluck($scope.siteRank.targets, 'idValue'), $scope.siteRank.options.startDate, $scope.siteRank.options.endDate)
                    .then(function (response) {
                        $scope.siteRank.sites = _.isEmpty(CONFIG.solr.siteDedupField) ?
                            response.data.response.docs :
                            _.uniq(response.data.response.docs, CONFIG.solr.siteDedupField); //remove dups, only show top rank for each
                        $scope.siteRank.siteMeta = {
                            maxScore: response.data.response.maxScore
                        };
                    }, function () {
                        $scope.siteRank.siteList.errorMessage = 'Error';
                    })
                    .finally(function () {
                        $scope.siteRank.siteList.loadingSites = false;
                    });
            },
            doMapOps: function () {
                $rootScope.$emit('SetMapDataLayerZoomState', false);
                _.chain($scope.siteRank.siteLayers).values().flatten().forEach(function (siteLayer) {
                    siteLayer.spatialQueryCount = siteLayer.isSelected ? 0 : null;
                });
                Utils.currentBrightColorIndex = 0;
                _.forEach($scope.siteRank.targets, function (target) {
                    var layerName = target.idValue + '@' + target.layer.name,
                        cql_filter = '(' + target.idField + " = '" + target.idValue + "')",
                        geoserverUrl = $filter('endpoint')(target.geoserverUrl, 'wms', true);
                    if (_.isDate($scope.siteRank.options.startDate)) {
                        cql_filter += ' AND (dtg > ' + moment($scope.siteRank.options.startDate).format('YYYY-MM-DD') + 'T' + moment($scope.siteRank.options.startTime).format('HH:mm:ss.SSS') + 'Z)';
                    }
                    if (_.isDate($scope.siteRank.options.endDate)) {
                        cql_filter += ' AND (dtg < ' + moment($scope.siteRank.options.endDate).format('YYYY-MM-DD') + 'T' + moment($scope.siteRank.options.endTime).format('HH:mm:ss.SSS') + 'Z)';
                    }
                    target.spatialQueryStatus = 'running';

                    var extent = null,
                        req = stealth.jst['wps/bounds_layer-filter.xml']({
                            layer: target.layer.name,
                            filter: cql_filter
                        });
                    /* Remove bounds request until we have a working Bounds process.
                    $http.post($filter('endpoint')(geoserverUrl, 'wps'), req, {timeout: 30000})
                        .then(function (data) {
                            var obj = (new OpenLayers.Format.OWSCommon.v1_1_0()).read(OpenLayers.Format.XML.prototype.read.apply(this, [data.data]));
                            extent = obj.bounds;
                        })
                        .finally(function () {*/
                            $rootScope.$emit("ReplaceWmsMapLayers", [layerName], {
                                name: layerName,
                                url: geoserverUrl,
                                layers: [target.layer.name],
                                styles: 'stealth_dataPoints',
                                env: 'color:' + Utils.getBrightColor().substring(1),
                                cql_filter: cql_filter,
                                extent: extent,
                                loadEndCallback: function () {
                                    target.spatialQueryStatus = 'done';
                                }
                            });
                        //});
                    $scope.siteRank.doProximity(geoserverUrl, target.layer.name, cql_filter);
                });
            }
        };

        $scope.addTargets = {
            serverData: {
                // The value the user enters into the form.
                proposedGeoserverUrl: CONFIG.geoserver.defaultUrl,
                // The value after the users clicks 'Choose'.
                currentGeoserverUrl: null
            },
            layerData: {},
            targetData: {},
            submit: function () {
                $scope.addTargets.getFeature();
            },
            showWindow: function () {
                $modal.open({
                    scope: $scope,
                    backdrop: 'static',
                    templateUrl: 'siterank/addTargetsForm.tpl.html',
                    controller: function ($scope, $modalInstance) {
                        $scope.modal = {
                            cancel: function () {
                                $modalInstance.dismiss('cancel');
                            }
                        };
                    }
                });
            },
            formStep: function () {
                var step = 1; // Show the server url input
                if ($scope.addTargets.serverData.currentGeoserverUrl && !$scope.addTargets.serverData.error &&
                        $scope.addTargets.layerData && $scope.addTargets.layerData.layers) {
                    step = 2; // Show the input type select
                    if($scope.addTargets.layerData.currentLayer && !$scope.addTargets.layerData.error && $scope.addTargets.featureTypeData) {
                        step = 3; // Show the layer details and ID input
                    }
                }
                return step;
            },
            updateServer: function () {
                $scope.addTargets.serverData.error = null;
                $scope.addTargets.showSpinner = true;
                $scope.addTargets.serverData.currentGeoserverUrl = $scope.addTargets.serverData.proposedGeoserverUrl;
                $scope.addTargets.targetData = {};
                $scope.addTargets.layerData = {};

                // Get the layer list from the GetCapabilities WFS operation.
                WFS.getCapabilities(
                    _.map(CONFIG.geoserver.workspaces.data, function (workspace) {
                        return $scope.addTargets.serverData.currentGeoserverUrl + '/' + workspace;
                    })
                ).then(function (data) {
                    $scope.addTargets.serverData.error = null;
                    $scope.addTargets.layerData.layers = _.flatten(_.pluck(_.pluck(data, 'featureTypeList'), 'featureTypes'), true);
                }, function (reason) {
                    // The GetCapabilites request failed.
                    $scope.addTargets.serverData.error = 'GetCapabilities request failed. Error: ' + reason.status + ' ' + reason.statusText;
                }).finally(function () {
                    $scope.addTargets.showSpinner = false;
                });
            },
            getFeatureTypeDescription: function () {
                $scope.addTargets.layerData.error = null;
                $scope.addTargets.showSpinner = true;
                $scope.addTargets.targetData = {};
                $scope.addTargets.featureTypeData = null;

                WFS.getFeatureTypeDescription($scope.addTargets.serverData.currentGeoserverUrl, $scope.addTargets.layerData.currentLayer.name).then(function (data) {
                    $scope.addTargets.featureTypeData = data;
                    if (data.error) {
                        $scope.addTargets.featureTypeData = 'unavailable';
                        // Response is successful, but no description is found for the type.
                    }
                }, function (reason) {
                    $scope.addTargets.serverData.error = 'GetFeatureTypeDescription request failed. Error: ' + reason.status + ' ' + reason.statusText;
                }).finally(function () {
                    $scope.addTargets.showSpinner = false;
                });
            },
            getFeature: function () {
                $scope.addTargets.addTargets([{
                    geoserverUrl: $scope.addTargets.serverData.currentGeoserverUrl,
                    layer: $scope.addTargets.layerData.currentLayer,
                    idField: CONFIG.dataSources.targets[$scope.addTargets.layerData.currentLayer.name].idField,
                    idValue: $scope.addTargets.targetData.id
                }]);
            },
            addTargets: function (targetsToAdd) {
                $scope.siteRank.targets = $scope.siteRank.targets.concat(targetsToAdd);
            }
        };

        //TODO - don't use $rootScope for this
        if ($rootScope.targetsForSiteRank) {
            $scope.addTargets.addTargets($rootScope.targetsForSiteRank);
            delete $rootScope.targetsForSiteRank;
        }
    }])
;
