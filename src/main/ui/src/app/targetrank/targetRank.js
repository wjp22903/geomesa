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
                    $rootScope.$emit('ShowTargetHistory', $filter('endpoint')($scope.serverData.currentGeoserverUrl, 'wms', true),
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
                                geoserverUrl: $scope.serverData.currentGeoserverUrl,
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
            matchGeoserverWorkspace: function (layer) {
                return _.some(CONFIG.geoserver.workspaces[$scope.inputData.type], function (workspace) {
                    var str = workspace + ':';
                    return layer.name.substring(0, str.length) === str;
                });
            },
            updateNumData: function (delay) {
                $timeout(function () {
                    $scope.targetRank.numData = _.chain($scope.dataLayers).values().flatten().reduce(function (count, dataLayer) {
                        if (dataLayer.isSelected) {
                            count++;
                        }
                        return count;
                    }, 0).value();
                }, delay);
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
                    $scope.options.startDate = null;
                    $scope.options.startTime = _.cloneDeep(noTime);
                },
                clearEndDatetime: function () {
                    $scope.options.endDate = null;
                    $scope.options.endTime = _.cloneDeep(noTime);
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
                        RankService.getTargetRanksForSites(_.pluck(_.pluck($scope.targetRank.sites, 'properties'), CONFIG.dataSources.sites[$scope.layerData.currentLayer.name].idField), $scope.options.startDate, $scope.options.endDate)
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
                        RankService.getTargetRanksForTrack($scope.serverData.currentGeoserverUrl,
                            _.map(_.chain($scope.dataLayers).values().flatten().filter(function (dataLayer) {
                                return dataLayer.isSelected;
                            }).value(), function (dataLayer) {
                                return {
                                    name: dataLayer.name,
                                    idField: CONFIG.dataSources.targets[dataLayer.name].idField
                                };
                            }), {
                                inputLayer: $scope.layerData.currentLayer.name,
                                inputLayerFilter: $scope.filterData.cql,
                                maxSpeedMps: $scope.options.maxSpeedMps,
                                maxTimeSec: $scope.options.maxTimeSec
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
                        RankService.getTargetRanksForRoute($scope.serverData.currentGeoserverUrl,
                            _.map(_.chain($scope.dataLayers).values().flatten().filter(function (dataLayer) {
                                return dataLayer.isSelected;
                            }).value(), function (dataLayer) {
                                return {
                                    name: dataLayer.name,
                                    idField: CONFIG.dataSources.targets[dataLayer.name].idField
                                };
                            }), {
                                inputLayer: $scope.layerData.currentLayer.name,
                                inputLayerFilter: $scope.filterData.cql,
                                dataLayerFilter: '(dtg > ' +
                                    moment($scope.options.startDate).format('YYYY-MM-DD') + 'T' + moment($scope.options.startTime).format('HH:mm:ss.SSS') +
                                    'Z) AND (dtg < ' + moment($scope.options.endDate).format('YYYY-MM-DD') + 'T' + moment($scope.options.endTime).format('HH:mm:ss.SSS') + 'Z)',
                                bufferMeters: $scope.options.proximityMeters
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
            }
        };

        $scope.targetRank.doProximity = function () {
            var proxFn, proxArg = {
                style: 'stealth_dataPoints',
                geoserverUrl: $scope.serverData.currentGeoserverUrl,
                inputLayer: $scope.layerData.currentLayer.name,
                inputLayerFilter: $scope.filterData.cql
            };
            switch ($scope.targetRank.inputData.type) {
                case 'site':
                case 'route':
                    proxFn = ProximityService.doLayerProximity;
                    proxArg = _.merge(proxArg, {
                        dataLayerFilter: '(dtg > ' +
                            moment($scope.options.startDate).format('YYYY-MM-DD') + 'T' + moment($scope.options.startTime).format('HH:mm:ss.SSS') +
                            'Z) AND (dtg < ' + moment($scope.options.endDate).format('YYYY-MM-DD') + 'T' + moment($scope.options.endTime).format('HH:mm:ss.SSS') + 'Z)',
                        bufferMeters: $scope.options.proximityMeters
                    });
                    break;
                case 'track':
                    proxFn = ProximityService.doTrackProximity;
                    proxArg = _.merge(proxArg, {
                        maxSpeedMps: $scope.options.maxSpeedMps,
                        maxTimeSec: $scope.options.maxTimeSec
                    });
                    break;
                default:
                    alert('Error: No proximity search available for this input type');
            }

            if (_.isFunction(proxFn)) {
                Utils.currentBrightColorIndex = 0;
                _.chain($scope.dataLayers).values().flatten().filter(function (dataLayer) {
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
        };

        // Geoserver url
        $scope.serverData = {
            // The value the user enters into the form.
            proposedGeoserverUrl: CONFIG.geoserver.defaultUrl,
            // The value after the users clicks 'Choose'.
            currentGeoserverUrl: null
        };

        $scope.options = {
            startDate: aWeekAgo,
            startTime: _.cloneDeep(aWeekAgo),
            endDate: now,
            endTime: _.cloneDeep(now)
        };
        $scope.dataLayers = {};
        $scope.layerData = {};
        $scope.inputData = {};
        $scope.filterData = {};
        $scope.addSites = {
            types: [{
                key: 'site',
                display: 'Sites'
            }, {
                key: 'track',
                display: 'Track'
            }, {
                key: 'route',
                display: 'Route'
            }]
        };

        // Used to display form fields in a step-by-step manner.
        $scope.addSites.formStep = function () {
            var step = 1; // Show the server url input
            if ($scope.serverData.currentGeoserverUrl && !$scope.serverData.error &&
                    $scope.layerData && $scope.layerData.layers) {
                step = 2; // Show the input type select
                if ($scope.inputData.type) {
                    step = 3; // Show the layer select input
                    if($scope.layerData.currentLayer && !$scope.layerData.error && $scope.featureTypeData) {
                        step = 4; // Show the layer details and cql query input
                    }
                }
            }
            return step;
        };

        // When the user changes the input data type, switch display value
        $scope.$watch('inputData.type', function (newVal, oldVal) {
            $scope.addSites.showSpinner = true;
            if (newVal !== oldVal) {
                if ($scope.inputData.type) {
                    $scope.inputData.display = _.find($scope.addSites.types, function (type) {
                        return type.key === $scope.inputData.type;
                    }).display;
                } else {
                    $scope.inputData.display = null;
                }
                $scope.layerData.currentLayer = null;
            }
            $scope.addSites.showSpinner = false;
        });

        // Invoked when the user clicks the 'Choose' button on the server url field.
        $scope.addSites.updateServer = function () {
            $scope.serverData.error = null;
            $scope.addSites.showSpinner = true;
            $scope.serverData.currentGeoserverUrl = $scope.serverData.proposedGeoserverUrl;
            $scope.inputData = {};
            $scope.layerData = {};
            $scope.filterData = {};

            // Get the layer list from the GetCapabilities WMS operation.
            WMS.getCapabilities($scope.serverData.currentGeoserverUrl).then(function (data) {
                var layers = data.capability.layers;
                $scope.serverData.error = null;
                $scope.layerData.layers = layers;

                $scope.dataLayers = _.chain(_.filter(layers, function (layer) {
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
                $scope.serverData.error = 'GetCapabilities request failed. Error: ' + reason.status + ' ' + reason.statusText;
            }).finally(function () {
                $scope.addSites.showSpinner = false;
            });
        };

        // Invoked when the current selected layer changes.
        $scope.addSites.getFeatureTypeDescription = function () {
            $scope.layerData.error = null;
            $scope.addSites.showSpinner = true;
            $scope.filterData = {};
            $scope.featureTypeData = null;

            WFS.getFeatureTypeDescription($scope.serverData.currentGeoserverUrl, $scope.layerData.currentLayer.name).then(function (data) {
                $scope.featureTypeData = data;
                if (data.error) {
                    $scope.featureTypeData = 'unavailable';
                    // Response is successful, but no description is found for the type.
                }
            }, function (reason) {
                $scope.serverData.error = 'GetFeatureTypeDescription request failed. Error: ' + reason.status + ' ' + reason.statusText;
            }).finally(function () {
                $scope.addSites.showSpinner = false;
            });
        };

        $scope.addSites.getFeature = function () {
            var url = $scope.serverData.currentGeoserverUrl,
                layerName = $scope.layerData.currentLayer.name,
                cql = _.isEmpty($scope.filterData.cql) ? null : $scope.filterData.cql;
            $scope.targetRank.loadingSites = true;
            $scope.targetRank.inputList.currentPage = 1;

            $rootScope.$emit('RemoveMapLayers', _.pluck($scope.addSites.types, 'display'));

            WFS.getFeature(url, layerName, {
                cql_filter: cql,
                sortBy: $scope.targetRank.inputData.type === 'track' ? 'dtg' : null
            }).then(function (response) {
                $scope.targetRank.sites = response.data.features;
                if (!_.isArray($scope.targetRank.sites)) {
                    $scope.targetRank.sites = [];
                }
                if ($scope.targetRank.sites.length < 1) {
                    alert('No results found.');
                } else {
                    $scope.options = {
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
                        name: $scope.targetRank.inputData.display,
                        url: $filter('endpoint')(url, 'wms', true),
                        layers: [layerName],
                        styles: $scope.targetRank.inputData.type === 'route' ? 'stealth_tpInput_line' : 'stealth_tpInput_point',
                        cql_filter: cql,
                        extent: extent
                    });
                }
            }).finally(function () {
                $scope.targetRank.loadingSites = false;
            });
        };

        $scope.addSites.submit = function () {
            $scope.targetRank.inputData = angular.copy($scope.inputData);
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
