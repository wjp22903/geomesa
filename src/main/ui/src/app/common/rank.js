angular.module('stealth.common.rank', [
    'stealth.ows.ows'
])
    .service('RankService', ['$q', '$http', '$filter', 'CONFIG', function ($q, $http, $filter, CONFIG) {
        function submitWpsRequest (geoserverUrl, req) {
            var deferred = $q.defer();
            $http.post($filter('endpoint')(geoserverUrl, 'wps'), req)
                .success(function (data, status, headers, config) {
                    deferred.resolve(data);
                })
                .error(function (data, status, headers, config) {
                    deferred.reject('error'); //TODO - show error from response
                });
            return deferred.promise;
        }

        //resultsArr is an associative array of arrays.  Each inner array is a ranking set for one datasource.
        //Combine them and return a single merged array.
        function combineWpsResults (resultsArr) {
            // Helper function to combine stddev's, only when independent
            function combineStddev(d1, d2) {
                return Math.sqrt(d1 * d1 + d2 * d2);
            }

            if (_.isEmpty(resultsArr)) {
                return [];
            } else {
                var maxScore = 0,
                    gridSize = null,
                    nRouteGridCells = null,
                    res = {};

                // Combine scores by key across datasource
                _.each(resultsArr, function (value, dataSource) {
                    _.each(value.results, function (r) {
                        if (_.isNull(gridSize)) {
                            gridSize = r.gridSize;
                        }
                        if (_.isNull(nRouteGridCells)) {
                            nRouteGridCells = r.nRouteGridCells;
                        }
                        if (r.key in res) {
                            // Combining two rankings with the same key
                            var tubeCount = res[r.key].counts.route + r.counts.route;
                            var boxCount = res[r.key].counts.box + r.counts.box;
                            var boxCellsCovered = res[r.key].cellsCovered.box + r.cellsCovered.box;
                            var tubeCellsCovered = res[r.key].cellsCovered.route + r.cellsCovered.route;
                            var idf = Math.log(gridSize / boxCellsCovered);
                            var tfIdf = idf * tubeCount;
                            var tubeStddev = combineStddev(res[r.key].routeCellDeviation.stddev, r.routeCellDeviation.stddev);
                            var scaledTubeCellStddev = (tubeCount > 0.0) ? tubeCount / nRouteGridCells : 0.0;
                            var tubeCellDeviationScore = Math.exp(-1.0 * scaledTubeCellStddev);
                            var avgPerTubeCell = tubeCount / nTubeCells;
                            var scaledTfIdf = idf * avgPerTubeCell;
                            var percentageOfTubeCellsCovered = tubeCellsCovered / nTubeCells;
                            var motionEvidenceTotal = res[r.key].motionEvidence.total + r.motionEvidence.total;
                            var motionEvidenceMax = Math.max(res[r.key].motionEvidence.max + r.motionEvidence.max);
                            var motionEvidenceStddev = combineStddev(res[r.key].motionEvidence.stddev, r.motionEvidence.stddev);
                            var combinedScoreNoMotion = Math.pow(scaledTfIdf * percentageOfTubeCellsCovered * tubeCellDeviationScore, 1.0/3.0);
                            var combinedScore = (motionEvidenceTotal > 0) ? Math.pow(combinedScoreNoMotion * Math.log(motionEvidenceTotal + 1) * motionEvidenceMax, 1.0/3.0) : 0.0;

                            res[r.key] = {
                                key: r.key,
                                counts: {
                                    route: tubeCount,
                                    box: boxCount
                                },
                                cellsCovered: {
                                    box: boxCellsCovered,
                                    route: routeCellsCovered,
                                    percentageOfRouteCovered: percentageOfTubeCellsCovered,
                                    avgPerRouteCell: avgPerTubeCell
                                },
                                routeCellDeviation: {
                                    stddev: tubeStddev,
                                    scaledStddev: scaledTubeStddev,
                                    deviationScore: tubeCellDeviationScore
                                },
                                tfIdf: {
                                    idf: idf,
                                    tfIdf: tfIdf,
                                    scaledTfIdf: scaledTfIdf
                                },
                                motionEvidence: {
                                    total: motionEvidenceTotal,
                                    max: motionEvidenceMax,
                                    stddev: motionEvidenceStddev
                                },
                                combined: {
                                    scoreNoMotion: combinedScoreNoMotion,
                                    score: combinedScore
                                },
                                dataSource: dataSource
                            };
                            maxScore = Math.max(maxScore, combinedScore);
                        } else {
                            // Adding a new ranking to the response, key has not been encountered yet
                            res[r.key] = _.merge(r, {dataSource: dataSource});
                            maxScore = Math.max(maxScore, r.combined.score);
                        }
                    });
                });

                var response = {
                    maxScore: maxScore,
                    gridSize: gridSize,
                    nRouteGridCells: nRouteGridCells,
                    results: _.sortBy(_.values(res), function (value) {
                        return value.combined.score;
                    }).reverse()
                };

                return response;
            }
        }

        this.getTargetRanksForSites = function (siteIds, startDate, endDate) {
            var url = CONFIG.solr.url + '/targetSearch/select',
                and = ['(' + siteIds.join(' OR ') + ')'],
                startDateStr = '*',
                endDateStr = '*';
            if (_.isDate(startDate)) {
                startDateStr = moment(startDate).format('YYYY-MM');
            }
            if (_.isDate(endDate)) {
                //increment month to fully include date range
                endDateStr = moment(new Date(_.cloneDeep(endDate).setMonth(endDate.getMonth() + 1))).format('YYYY-MM');
            }
            and.push('(time:[' + startDateStr + ' TO ' + endDateStr + '])');
            return $http.get(url, {
                params: {
                    rows: 1000,
                    q: and.join(' AND '),
                    fl: '*,score',
                    wt: 'json'
                }
            });
        };

        //arg contains inputLayer, inputLayerFilter, dataLayerFilter, maxSpeedMps, maxTimeSec
        this.getTargetRanksForTrack = function (geoserverUrl, dataLayerNameAndIdFields, arg) {
            var deferred = $q.defer(),
                templateFn = _.isEmpty(arg.inputLayerFilter) ? stealth.jst['wps/trackRank_layer.xml'] : stealth.jst['wps/trackRank_layer-filter.xml'],
                count = dataLayerNameAndIdFields.length,
                results = {};

            if (count > 0) {
                _.each(dataLayerNameAndIdFields, function (dataLayer) {
                    submitWpsRequest(geoserverUrl, templateFn(_.merge({dataLayer: dataLayer.name, inputIdField: dataLayer.idField}, arg)))
                        .then(function (response) {
                            count--;
                            results[dataLayer.name] = response;
                            if (count <= 0) {
                                deferred.resolve(results);
                            }
                        });
                });
                return deferred.promise.then(function (results) {
                    return combineWpsResults(results);
                });
            } else {
                return $q.when([]);
            }
        };

        //arg contains inputLayer, inputLayerFilter, dataLayerFilter, bufferMeters
        this.getTargetRanksForRoute = function (geoserverUrl, dataLayerNameAndIdFields, arg) {
            var deferred = $q.defer(),
                templateFn = _.isEmpty(arg.inputLayerFilter) ? stealth.jst['wps/routeRank_layer.xml'] : stealth.jst['wps/routeRank_layer-filter.xml'],
                count = dataLayerNameAndIdFields.length,
                results = {};

            if (count > 0) {
                _.each(dataLayerNameAndIdFields, function (dataLayer) {
                    submitWpsRequest(geoserverUrl, templateFn(_.merge({dataLayer: dataLayer.name, inputIdField: dataLayer.idField}, arg)))
                        .then(function (response) {
                            count--;
                            results[dataLayer.name] = response;
                            if (count <= 0) {
                                deferred.resolve(results);
                            }
                        });
                });
                return deferred.promise.then(function (results) {
                    return combineWpsResults(results);
                });
            } else {
                return $q.when([]);
            }
        };

        this.getSiteRanksForTargets = function (targetIds, startDate, endDate) {
            var url = CONFIG.solr.url + '/siteSearch/select',
                and = ['(' + targetIds.join(' OR ') + ')'],
                startDateStr = '*',
                endDateStr = '*';
            if (_.isDate(startDate)) {
                startDateStr = moment(startDate).format('YYYY-MM');
            }
            if (_.isDate(endDate)) {
                //increment month to fully include date range
                endDateStr = moment(new Date(_.cloneDeep(endDate).setMonth(endDate.getMonth() + 1))).format('YYYY-MM');
            }
            and.push('(time:[' + startDateStr + ' TO ' + endDateStr + '])');
            return $http.get(url, {
                params: {
                    rows: 1000,
                    q: and.join(' AND '),
                    fl: '*,score',
                    wt: 'json'
                }
            });
        };
    }])
;
