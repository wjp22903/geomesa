angular.module('stealth.targetpri.runner')

.service('stealth.targetpri.runner.rankService', [
'$q',
'wps',
'CONFIG',
'colors',
function ($q, wps, CONFIG, colors) {
    //arg contains inputGeoJson, bufferMeters, uniquenessWeight, durationWeight, prevalenceWeight, proximityWeight
    this.doGeoJsonTargetPriRank = function (templateFile, dataSourcesAndPromises, arg, parseDatasource) {
        var deferred = $q.defer(),
            templateFn = stealth.jst[templateFile],
            count = dataSourcesAndPromises.length,
            dataSources = {},
            results = {};
        if (count > 0) {
            _.each(dataSourcesAndPromises, function (dataSource) {
                dataSource.proximityPromise.then(function (layerName) {
                    var req = templateFn(_.merge(parseDatasource(dataSource),
                        {
                            proximityLayer: layerName
                        }, arg));
                    dataSource.dataSource.proximityLayerName = layerName;
                    dataSources[dataSource.dataSource.Name] = dataSource.dataSource;
                    wps.submit(CONFIG.geoserver.defaultUrl, req, CONFIG.geoserver.omitProxy)
                    .then(function (response) {
                        results[dataSource.dataSource.Name] = response;
                    })['finally'](function () {
                        if (--count <= 0) {
                            deferred.resolve(results);
                        }
                    });
                }, function (reason) {
                    deferred.reject(reason);
                });
            });
            return deferred.promise.then(function (results) {
                if (arg.targetType === 'Sites') {
                    return combineWpsResultsForSitesSimp(results, dataSources);
                } else {
                    return combineWpsResults(results, dataSources);
                }
            });
        } else {
            return $q.when([]);
        }
    };
    this.colorPoints = function (response) {
        var templateFn = stealth.jst['sld/point_colorBy.xml'],
            top = {},
            howMany = 10;
        _.each(_.take(response.combined.results, howMany), function (result, index) {
            result.color = colors.getColor(index);
            if (top[result.dataSource.Name]) {
                top[result.dataSource.Name].push(result);
            } else {
                top[result.dataSource.Name] = [result];
            }
        });
        _.each(response.dataSources, function (dataSource) {
            dataSource.proximityLayer.updateRequestParams({
                STYLES: null,
                ENV: null,
                SLD_BODY: templateFn({
                    layerName: dataSource.proximityLayerName,
                    attribute: dataSource.fieldNames.id,
                    valueMap: _.map(top[dataSource.Name], function (result) {
                        return '<ogc:Literal>' + result.key + '</ogc:Literal>' +
                        '<ogc:Literal>' + result.color + '</ogc:Literal>';
                    }).join('')
                }).replace(/(\r\n|\n|\r)\s*/gm, ' ')
            });
        });
    };

    //results is an associative array of arrays.  Each inner array is a ranking set for one datasource.
    //Combine them and return a single merged array.
    function combineWpsResults (results, dataSources) {
        // Helper function to combine stddev's, only when independent
        function combineStddev (d1, d2) {
            return Math.sqrt(d1 * d1 + d2 * d2);
        }
        var maxScore = 0,
            gridSize = null,
            nRouteGridCells = null,
            res = {};

        // Combine scores by key across datasource
        _.each(results, function (value, dataSourceName) {
            _.each(value.results, function (r) {
                if (_.isNull(gridSize)) {
                    gridSize = value.gridSize;
                }
                if (_.isNull(nRouteGridCells)) {
                    nRouteGridCells = value.nRouteGridCells;
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
                    var avgPerTubeCell = (nRouteGridCells > 0) ? tubeCount / nRouteGridCells : 0.0;
                    var scaledTfIdf = idf * avgPerTubeCell;
                    var percentageOfTubeCellsCovered = (nRouteGridCells > 0) ? tubeCellsCovered / nRouteGridCells : 0.0;
                    var routeCoverage = 1.0 - ((1.0 - res[r.key].routeCoverage) * (1.0 - r.routeCoverage));
                    var motionEvidenceTotal = res[r.key].motionEvidence.total + r.motionEvidence.total;
                    var motionEvidenceMax = Math.max(res[r.key].motionEvidence.max, r.motionEvidence.max);
                    var motionEvidenceStddev = combineStddev(res[r.key].motionEvidence.stddev, r.motionEvidence.stddev);
                    var combinedScoreNoMotion = Math.pow(scaledTfIdf * routeCoverage * tubeCellDeviationScore, 1.0/3.0);
                    var combinedScore = (motionEvidenceTotal > 0) ? Math.pow(combinedScoreNoMotion * Math.log(motionEvidenceTotal + 1) * motionEvidenceMax, 1.0/3.0) : 0.0;

                    res[r.key] = {
                        key: r.key,
                        routeCoverage: routeCoverage,
                        counts: {
                            route: tubeCount,
                            box: boxCount
                        },
                        cellsCovered: {
                            box: boxCellsCovered,
                            route: tubeCellsCovered,
                            percentageOfRouteCovered: percentageOfTubeCellsCovered,
                            avgPerRouteCell: avgPerTubeCell
                        },
                        routeCellDeviation: {
                            stddev: tubeStddev,
                            scaledStddev: scaledTubeCellStddev,
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
                        dataSource: dataSources[dataSourceName]
                    };
                    maxScore = Math.max(maxScore, combinedScore);
                } else {
                    // Adding a new ranking to the response, key has not been encountered yet
                    res[r.key] = _.merge(r, {dataSource: dataSources[dataSourceName]});
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

        return {
            combined: response,
            dataSources: dataSources
        };
    }

    // results is an associative array of arrays.  Each inner array is a ranking set for one datasource.
    // Force the keys to be different by appending the data source name to the key. Then we don't ever
    // combine scores. This isn't the right long-term solution, but may not be too unreasonable for now.
    function combineWpsResultsForSitesSimp (results, dataSources) {
        var maxScore = 0,
            res = {};

        // Combine scores by key across datasource
        _.each(results, function (value, dataSourceName) {
            _.each(value.results, function (r) {
                if (_.keys(dataSources).length > 1) {
                    // for all potential duplicates, set key to (key + datasource)
                    var newKey = r.key + ' (' + dataSourceName + ')';
                    res[newKey] = _.merge(r, {key: newKey, dataSource: dataSources[dataSourceName]});
                } else {
                    res[r.key] = _.merge(r, {dataSource: dataSources[dataSourceName]});
                }
                maxScore = Math.max(maxScore, r.aggregateScore);
            });
        });
        var response = {
            maxScore: maxScore,
            results: _.sortBy(_.values(res), 'aggregateScore').reverse()
        };
        return {
            combined: response,
            dataSources: dataSources
        };
    }
}])

.filter('sitesResultsFilter', [
function () {
    return function (result) {
        var output = _.clone(result);
        delete output['key'];
        delete output['dataSource'];
        delete output['color'];
        return output;
    };
}])
;
