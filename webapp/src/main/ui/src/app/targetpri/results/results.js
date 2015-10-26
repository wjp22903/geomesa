angular.module('stealth.targetpri.results', [
    'ccri.angular-utils',
    'stealth.core.geo.ol3.geodetics'
])

.directive('stTargetPriResults', [
'ol3Geodetics',
'stealth.targetpri.geo.ol3.layers.targetPriResultLayerExtender',
function (ol3Geodetics, tpExtender) {
    return {
        restrict: 'E',
        templateUrl: 'targetpri/results/results.tpl.html',
        controller: ['$scope', function ($scope) {
            if (!$scope.status) {
                $scope.status = {
                    waiting: true
                };
                if ($scope.request.targetType !== 'Sites') {
                    $scope.extraRequestInfo = {
                        routeMeters: ol3Geodetics.distanceVincenty(
                            $scope.request.targetFeature.getGeometry().getCoordinates())
                    };
                    $scope.sortOpts = {
                        Score: false,
                        'Route coverage': function (value) {
                            return value.routeCoverage;
                        },
                        Count: function (value) {
                            return value.counts.route;
                        },
                        'Score (no motion)': function (value) {
                            return value.combined.scoreNoMotion;
                        }
                    };
                } else {
                    $scope.sortOpts = {
                        Score: false,
                        Count: function (value) {
                            return value.pingCount;
                        },
                        'Site Score': function (value) {
                            return value.siteScore;
                        },
                        'Day Score': function (value) {
                            return value.dayScore;
                        },
                        'Ping Score': function (value) {
                            return value.pingScore;
                        },
                        'Proximity Score': function (value) {
                            return value.proxScore;
                        }
                    };
                }
                $scope.sortProp = $scope.sortOpts.Score;
                $scope.updateSort = function () {
                    $scope.response.results =
                        _.isFunction($scope.sortProp) ?
                            _.sortBy($scope.originalResults, function () { return -$scope.sortProp.apply(this, arguments); }) :
                            _.cloneDeep($scope.originalResults);
                };
                $scope.expandAll = function () {
                    _.each($scope.response.results, function (result) {
                        result.isExpanded = true;
                    });
                };
                $scope.collapseAll = function () {
                    _.each($scope.response.results, function (result) {
                        result.isExpanded = false;
                    });
                };
                $scope.buildRecord = function (dataSource, idFieldValue) {
                    var temp = {};
                    temp[dataSource.fieldNames.id] = idFieldValue;
                    return temp;
                };
                $scope.capabilities = {};
                _.forEach($scope.request.dataSources, function (dataSource) {
                    $scope.capabilities[dataSource.Name] = tpExtender.extendCapabilities({}, this, {
                        dataSource: dataSource,
                        request: $scope.request
                    });
                });

                $scope.promise.then(function (response) {
                    $scope.status.waiting = false;
                    $scope.originalResults = _.cloneDeep(response.results);
                    $scope.response = response;
                }, function (reason) {
                    $scope.status.waiting = false;
                    $scope.status.error = true;
                    $scope.status.errorMessage = reason;
                });
            }
        }]
    };
}])
;
