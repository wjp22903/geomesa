angular.module('stealth.targetrank.targetRank', [
    'stealth.common.imagery.imageryManager',
    'stealth.common.proximity',
    'stealth.common.utils',
    'stealth.common.map.openlayersMap',
    'stealth.common.panes.centerPane',
    'stealth.common.panes.leftPane',
    'stealth.common.panes.centerTop',
    'stealth.common.panes.centerRight',
    'stealth.common.groupCheckbox',
    'stealth.common.layermanager.openlayersManager',
    'stealth.common.rank',
    'stealth.ows.ows',
    'ui.layout',
    'ui.bootstrap.buttons'
])

    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/targetRank', {
            templateUrl: 'targetrank/targetRank.tpl.html'
        });
    }])

    .controller('TargetRankController', [
    '$scope', '$rootScope', '$modal', '$filter', '$timeout', '$location', 'WMS', 'WFS', 'CONFIG', 'ProximityService', 'RankService', 'Utils',
    function($scope, $rootScope, $modal, $filter, $timeout, $location, WMS, WFS, CONFIG, ProximityService, RankService, Utils) {
        var now = new Date(),
            aWeekAgo = new Date(),
            noTime = new Date(),
            offset = moment().zone();
        now.setMinutes(now.getMinutes() + offset);
        aWeekAgo.setDate(now.getDate() - 7);
        aWeekAgo.setMinutes(aWeekAgo.getMinutes() + offset);
        noTime.setHours(0);
        noTime.setMinutes(0);

        $scope.targetRank = {
            sites: [],  //"input"
            inputList: {
                currentPage: 1,
                pageSize: 10,
                numberOfPages: function () {
                    if ($scope.targetRank.sites) {
                        return Math.ceil($scope.targetRank.sites.length/$scope.targetRank.inputList.pageSize);
                    }
                    return 0;
                }
            },
            targets: [],
            targetList: {
                currentPage: 1,
                pageSize: 30,
                numberOfPages: function () {
                    if ($scope.targetRank.targets) {
                        return Math.ceil($scope.targetRank.targets.length/$scope.targetRank.targetList.pageSize);
                    }
                    return 0;
                },
                showHistory: function (target) {
                    if (_.isUndefined(target.dataSource)) {
                        throw new Error('No datasource for target ' + target.target);
                    }
                    $rootScope.$emit('ShowTargetHistory', $filter('endpoint')($scope.targetRank.serverData.currentGeoserverUrl, 'wms', true),
                        CONFIG.dataSources.targets[target.dataSource].idField,
                        target.target, target.dataSource);
                },
                sendSelectedToSiteRank: function () {
                    var selected = _.filter($scope.targetRank.targets, 'isSelected'),
                        targets = _.map(selected, function (target) {
                            if (_.isUndefined(target.dataSource)) {
                                throw new Error('No datasource for target ' + target.target);
                            }
                            return {
                                geoserverUrl: $scope.targetRank.serverData.currentGeoserverUrl,
                                layer: {
                                    name: target.dataSource
                                },
                                idField: CONFIG.dataSources.targets[target.dataSource].idField,
                                idValue: target.target
                            };
                        });
                    $rootScope.targetsForSiteRank = targets; //TODO - don't use $rootScope for this
                    $location.path('/siteRank');
                }
            },
            isLeftPaneVisible: true,
            leftPaneView: 'analysis',
            //Input Data for current analysis, not what's on the add form
            inputData: {},
            numData: 0,
            updateNumData: function (delay) {
                $timeout(function () {
                    $scope.targetRank.numData = _.chain($scope.targetRank.dataLayers).values().flatten().reduce(function (count, dataLayer) {
                        if (dataLayer.isSelected) {
                            count++;
                        }
                        return count;
                    }, 0).value();
                }, delay);
            },
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
                    $scope.targetRank.options.startDate = null;
                    $scope.targetRank.options.startTime = _.cloneDeep(noTime);
                },
                clearEndDatetime: function () {
                    $scope.targetRank.options.endDate = null;
                    $scope.targetRank.options.endTime = _.cloneDeep(noTime);
                }
            },
            doRank: function () {
                delete $scope.targetRank.targetList.errorMessage;
                $scope.targetRank.targetList.currentPage = 1;
                $scope.targetRank.targets = [];
                $scope.targetRank.targetList.loadingTargets = true;
                $scope.targetRank.leftPaneView = 'targets'; //switch tabs
                switch ($scope.targetRank.inputData.type) {
                    case 'site':
                        RankService.getTargetRanksForSites(_.pluck(_.pluck($scope.targetRank.sites, 'properties'), CONFIG.dataSources.sites[$scope.targetRank.layerData.currentLayer.name].idField), $scope.targetRank.options.startDate, $scope.targetRank.options.endDate)
                            .then(function (response) {
                                $scope.targetRank.targets = _.map(_.uniq(response.data.response.docs, 'target'), //remove dups, only show top rank for each
                                    function (target) {
                                        return _.merge(target, {
                                            dataSource: _.isString(target.target) && target.target.trim().length > 5 ?
                                                null : null //Removed hard-coded datasource names; TODO - get datasource from ranker
                                        });
                                    }
                                );
                                $scope.targetRank.targetMeta = {
                                    maxScore: response.data.response.maxScore
                                };
                            }, function () {
                                $scope.targetRank.targetList.errorMessage = 'Error';
                            })
                            .finally(function () {
                                $scope.targetRank.targetList.loadingTargets = false;
                            });
                        break;
                    case 'track':
                        RankService.getTargetRanksForTrack($scope.targetRank.serverData.currentGeoserverUrl,
                            _.map(_.chain($scope.targetRank.dataLayers).values().flatten().filter(function (dataLayer) {
                                return dataLayer.isSelected;
                            }).value(), function (dataLayer) {
                                return {
                                    name: dataLayer.name,
                                    idField: CONFIG.dataSources.targets[dataLayer.name].idField
                                };
                            }), {
                                inputLayer: $scope.targetRank.layerData.currentLayer.name,
                                inputLayerFilter: $scope.targetRank.filterData.cql,
                                maxSpeedMps: $scope.targetRank.options.maxSpeedMps,
                                maxTimeSec: $scope.targetRank.options.maxTimeSec
                            }
                        )
                            .then(function (response) {
                                $scope.targetRank.targets = _.map(response.results, function (target) {
                                    return {
                                        target: target.key,
                                        score: target.combined.score,
                                        dataSource: target.dataSource
                                    };
                                });
                                $scope.targetRank.targetMeta = {
                                    maxScore: response.maxScore
                                };
                            })
                            .finally(function () {
                                $scope.targetRank.targetList.loadingTargets = false;
                            });
                        break;
                    case 'route':
                        RankService.getTargetRanksForRoute($scope.targetRank.serverData.currentGeoserverUrl,
                            _.map(_.chain($scope.targetRank.dataLayers).values().flatten().filter(function (dataLayer) {
                                return dataLayer.isSelected;
                            }).value(), function (dataLayer) {
                                return {
                                    name: dataLayer.name,
                                    idField: CONFIG.dataSources.targets[dataLayer.name].idField
                                };
                            }), {
                                inputLayer: $scope.targetRank.layerData.currentLayer.name,
                                inputLayerFilter: $scope.targetRank.filterData.cql,
                                dataLayerFilter: '(dtg > ' +
                                    moment($scope.targetRank.options.startDate).format('YYYY-MM-DD') + 'T' + moment($scope.targetRank.options.startTime).format('HH:mm:ss.SSS') +
                                    'Z) AND (dtg < ' + moment($scope.targetRank.options.endDate).format('YYYY-MM-DD') + 'T' + moment($scope.targetRank.options.endTime).format('HH:mm:ss.SSS') + 'Z)',
                                bufferMeters: $scope.targetRank.options.proximityMeters
                            }
                        )
                            .then(function (response) {
                                $scope.targetRank.targets = _.map(response.results, function (target) {
                                    return {
                                        target: target.key,
                                        score: target.combined.score,
                                        dataSource: target.dataSource
                                    };
                                });
                                $scope.targetRank.targetMeta = {
                                    maxScore: response.maxScore
                                };
                            })
                            .finally(function () {
                                $scope.targetRank.targetList.loadingTargets = false;
                            });
                        break;
                    default:
                        alert('Error: No ranking process available for this input type');
                }
            },
            doProximity: function () {
                var proxFn, proxArg = {
                    style: 'stealth_dataPoints',
                    geoserverUrl: $scope.targetRank.serverData.currentGeoserverUrl,
                    inputLayer: $scope.targetRank.layerData.currentLayer.name,
                    inputLayerFilter: $scope.targetRank.filterData.cql
                };
                switch ($scope.targetRank.inputData.type) {
                    case 'site':
                    case 'route':
                        proxFn = ProximityService.doLayerProximity;
                        proxArg = _.merge(proxArg, {
                            dataLayerFilter: '(dtg > ' +
                                moment($scope.targetRank.options.startDate).format('YYYY-MM-DD') + 'T' + moment($scope.targetRank.options.startTime).format('HH:mm:ss.SSS') +
                                'Z) AND (dtg < ' + moment($scope.targetRank.options.endDate).format('YYYY-MM-DD') + 'T' + moment($scope.targetRank.options.endTime).format('HH:mm:ss.SSS') + 'Z)',
                            bufferMeters: $scope.targetRank.options.proximityMeters
                        });
                        break;
                    case 'track':
                        proxFn = ProximityService.doTrackProximity;
                        proxArg = _.merge(proxArg, {
                            maxSpeedMps: $scope.targetRank.options.maxSpeedMps,
                            maxTimeSec: $scope.targetRank.options.maxTimeSec
                        });
                        break;
                    default:
                        alert('Error: No proximity search available for this input type');
                }

                if (_.isFunction(proxFn)) {
                    Utils.currentBrightColorIndex = 0;
                    _.chain($scope.targetRank.dataLayers).values().flatten().filter(function (dataLayer) {
                        delete dataLayer.spatialQueryStatus;
                        return dataLayer.isSelected;
                    }).forEach(function (dataLayer) {
                        proxArg.dataLayer = dataLayer.name;
                        proxArg.env = 'color:' + Utils.getBrightColor().substring(1);
                        dataLayer.spatialQueryStatus = 'running';
                        proxFn(proxArg).then(function () {
                            $rootScope.$emit('RaiseLayers', _.pluck($scope.addSites.types, 'display'), 1);
                            dataLayer.spatialQueryStatus = 'done';
                        }, function () {
                            dataLayer.spatialQueryStatus = 'error';
                        });
                    });
                }
            }
        };

        $scope.addSites = {
            serverData: {
                // The value the user enters into the form.
                proposedGeoserverUrl: CONFIG.geoserver.defaultUrl,
                // The value after the users clicks 'Choose'.
                currentGeoserverUrl: null
            },
            dataLayers: {},
            layerData: {},
            inputData: {},
            filterData: {},
            types: [{
                key: 'site',
                display: 'Sites'
            }, {
                key: 'track',
                display: 'Track'
            }, {
                key: 'route',
                display: 'Route'
            }],
            matchGeoserverWorkspace: function (layer) {
                return _.some(CONFIG.geoserver.workspaces[$scope.addSites.inputData.type], function (workspace) {
                    var str = workspace + ':';
                    return layer.name.substring(0, str.length) === str;
                });
            }
        };

        // Used to display form fields in a step-by-step manner.
        $scope.addSites.formStep = function () {
            var step = 1; // Show the server url input
            if ($scope.addSites.serverData.currentGeoserverUrl && !$scope.addSites.serverData.error &&
                    $scope.addSites.layerData && $scope.addSites.layerData.layers) {
                step = 2; // Show the input type select
                if ($scope.addSites.inputData.type) {
                    step = 3; // Show the layer select input
                    if($scope.addSites.layerData.currentLayer && !$scope.addSites.layerData.error && $scope.featureTypeData) {
                        step = 4; // Show the layer details and cql query input
                    }
                }
            }
            return step;
        };

        // When the user changes the input data type, switch display value
        $scope.$watch('addSites.inputData.type', function (newVal, oldVal) {
            $scope.addSites.showSpinner = true;
            if (newVal !== oldVal) {
                if ($scope.addSites.inputData.type) {
                    $scope.addSites.inputData.display = _.find($scope.addSites.types, function (type) {
                        return type.key === $scope.addSites.inputData.type;
                    }).display;
                } else {
                    $scope.addSites.inputData.display = null;
                }
                $scope.addSites.layerData.currentLayer = null;
            }
            $scope.addSites.showSpinner = false;
        });

        // Invoked when the user clicks the 'Choose' button on the server url field.
        $scope.addSites.updateServer = function () {
            $scope.addSites.serverData.error = null;
            $scope.addSites.showSpinner = true;
            $scope.addSites.serverData.currentGeoserverUrl = $scope.addSites.serverData.proposedGeoserverUrl;
            $scope.addSites.inputData = {};
            $scope.addSites.layerData = {};
            $scope.addSites.filterData = {};

            // Get the layer list from the GetCapabilities WMS operation.
            WMS.getCapabilities($scope.addSites.serverData.currentGeoserverUrl).then(function (data) {
                var layers = data.capability.layers;
                $scope.addSites.serverData.error = null;
                $scope.addSites.layerData.layers = layers;

                $scope.addSites.dataLayers = _.chain(_.filter(layers, function (layer) {
                    return _.contains(_.keys(CONFIG.dataSources.targets), layer.name);
                }))
                    // Streamline the properties we are including.
                    .map(function (workspace) {
                        return _.pick(workspace, ['name', 'prefix']);
                    })
                    // Build a map of workspaces
                    .groupBy('prefix')
                    // Only include the workspaces specified in the config.
                    .pick(CONFIG.geoserver.workspaces.data)
                    .value();
            }, function (reason) {
                // The GetCapabilites request failed.
                $scope.addSites.serverData.error = 'GetCapabilities request failed. Error: ' + reason.status + ' ' + reason.statusText;
            }).finally(function () {
                $scope.addSites.showSpinner = false;
            });
        };

        // Invoked when the current selected layer changes.
        $scope.addSites.getFeatureTypeDescription = function () {
            $scope.addSites.layerData.error = null;
            $scope.addSites.showSpinner = true;
            $scope.addSites.filterData = {};
            $scope.featureTypeData = null;

            WFS.getFeatureTypeDescription($scope.addSites.serverData.currentGeoserverUrl, $scope.addSites.layerData.currentLayer.name).then(function (data) {
                $scope.featureTypeData = data;
                if (data.error) {
                    $scope.featureTypeData = 'unavailable';
                    // Response is successful, but no description is found for the type.
                }
            }, function (reason) {
                $scope.addSites.serverData.error = 'GetFeatureTypeDescription request failed. Error: ' + reason.status + ' ' + reason.statusText;
            }).finally(function () {
                $scope.addSites.showSpinner = false;
            });
        };

        $scope.addSites.getFeature = function () {
            var url = $scope.addSites.serverData.currentGeoserverUrl,
                layerName = $scope.addSites.layerData.currentLayer.name,
                cql = _.isEmpty($scope.addSites.filterData.cql) ? null : $scope.addSites.filterData.cql;
            $scope.targetRank.loadingSites = true;
            $scope.targetRank.inputList.currentPage = 1;

            $rootScope.$emit('RemoveMapLayers', _.pluck($scope.addSites.types, 'display'));

            WFS.getFeature(url, layerName, {
                cql_filter: cql,
                sortBy: $scope.addSites.inputData.type === 'track' ? 'dtg' : null
            }).then(function (response) {
                $scope.targetRank.sites = response.data.features;
                if (!_.isArray($scope.targetRank.sites)) {
                    $scope.targetRank.sites = [];
                }
                if ($scope.targetRank.sites.length < 1) {
                    alert('No results found.');
                } else {
                    $scope.targetRank.options = {
                        startDate: aWeekAgo,
                        startTime: _.cloneDeep(aWeekAgo),
                        endDate: now,
                        endTime: _.cloneDeep(now)
                    };

                    var extent = null,
                        parser = new OpenLayers.Format.GeoJSON(),
                        features = parser.read(JSON.stringify(response.data));
                    if (features && features.length > 0) {
                        extent = new OpenLayers.Bounds();
                        _.forEach(features, function (feature) {
                            extent.extend(feature.geometry.getBounds());
                        });
                    }

                    // Update the map.
                    $rootScope.$emit('SetMapDataLayerZoomState', false);
                    $rootScope.$emit("ReplaceWmsMapLayers", _.pluck($scope.addSites.types, 'display'), {
                        name: $scope.addSites.inputData.display,
                        url: $filter('endpoint')(url, 'wms', true),
                        layers: [layerName],
                        styles: $scope.addSites.inputData.type === 'route' ? 'stealth_tpInput_line' : 'stealth_tpInput_point',
                        cql_filter: cql,
                        extent: extent
                    });
                }
            }).finally(function () {
                $scope.targetRank.loadingSites = false;
            });
        };

        $scope.addSites.submit = function () {
            $scope.targetRank.serverData = angular.copy($scope.addSites.serverData);
            $scope.targetRank.dataLayers = angular.copy($scope.addSites.dataLayers);
            $scope.targetRank.layerData = angular.copy($scope.addSites.layerData);
            $scope.targetRank.inputData = angular.copy($scope.addSites.inputData);
            $scope.targetRank.filterData = angular.copy($scope.addSites.filterData);
            $scope.addSites.getFeature();
        };

        $scope.addSites.showWindow = function () {
            $modal.open({
                scope: $scope,
                backdrop: 'static',
                templateUrl: 'targetrank/addSitesForm.tpl.html',
                controller: function ($scope, $modalInstance) {
                    $scope.modal = {
                        cancel: function () {
                            $modalInstance.dismiss('cancel');
                        }
                    };
                }
            });
        };
    }]);
