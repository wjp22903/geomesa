angular.module('stealth.routeanalysis.runner')

.service('analysisService', [
'$http',
'$q',
'wps',
'wms',
'CONFIG',
function ($http, $q, wps, wms, CONFIG) {
    //arg contains inputGeoJson, bufferMeters
    this.doGeoJsonLineQuery = function (dataSourcesAndPromises, arg) {
        var deferred = $q.defer(),
            templateFn = stealth.jst['wps/routeAnalysis_geojson.xml'],
            count = dataSourcesAndPromises.length,
            dataSources = {},
            results = {};

        if (count > 0) {
            // each prolly not needed, only expecting one
            _.each(dataSourcesAndPromises, function (dataSource) {
                // get some information about the raster

                //(url, omitProxy, forceRefresh, omitWms)
                var response = wms.getCapabilities(CONFIG.geoserver.defaultUrl, CONFIG.geoserver.omitProxy, true, false)
                .then(function(response) {

                    var coverageList = response.Capability.Layer.Layer;
                    var wantedCoverage;
                    for (var i = 0; i < coverageList.length; i++) {
                        if (coverageList[i].Name.indexOf(dataSource.Name) >= 0) {
                            // name includes workspace, so should be specific enough
                            wantedCoverage = coverageList[i];
                            break;
                        }
                        //error if raster name not found, esp since it came from a list of rasters
                    }

                    // information could come from dataSource as well, depending on future source of data
                    // TODO: worry about other CRS
                    var lowercorner = wantedCoverage.EX_GeographicBoundingBox[0] + " " + wantedCoverage.EX_GeographicBoundingBox[1],
                    uppercorner = wantedCoverage.EX_GeographicBoundingBox[2] + " " + wantedCoverage.EX_GeographicBoundingBox[3];
                    // no MIME type, assume tiff, need DescribeCoverage call for more info besides crs/bbox

                    // make linestring from the inputGeoJson
                    // sorry gross
                    var lineStr = "LINESTRING(",
                    coords = arg.inputGeoJson.values_.geometry.flatCoordinates;

                    // doesn't handle 3D points
                    for (i = 0; i < coords.length; i += 2) {
                        lineStr += coords[i] + " " + coords[i+1] + ", ";
                    }
                    lineStr = lineStr.slice(0, -2) + ")";

                    var req = templateFn(_.merge({
                        lineString: lineStr,
                        dataLayer: dataSource.Name, // workspace:layer
                        lowerCorner: lowercorner,
                        upperCorner: uppercorner,
                        resolution: arg.resolution
                    }, arg));

                    //dataSource.dataSource.proximityLayerName = layerName;
                    dataSources[dataSource.Name] = dataSource;
                    wps.submit(CONFIG.geoserver.defaultUrl + '/wps', req, CONFIG.geoserver.omitProxy)
                    .then(function (response) {
                        results[dataSource.Name] = response;
                    })['finally'](function () {
                        if (--count <= 0) {
                            deferred.resolve(results);
                        }
                    });

                });

            }, function (reason) {
                deferred.reject(reason);
            });
            return deferred.promise.then(function (results) {
                return extractRelevantValues(results, dataSources, arg.color);
            });
        } else {
            return $q.when([]);
        }
    };

    // so far only planning on one set of results
    // this function will extract the relevant values for later graphing
    function extractRelevantValues (results, dataSources, color) {

        if (_.isEmpty(results)) {
            return {
                combined: {
                    maxScore: 0,
                    results: []
                },
                dataSources: dataSources
            };
        } else {
            // get out coords, make into linear distance
            // pair distance with values

            var response = [],
                count = 0;

            _.each(results, function (i) {
                _.each (i.features, function (indResult) {
                    response[count++] = {
                        id: count,
                        x: indResult.properties.dist,
                        y: indResult.properties.value};
                });
            });

            return {
                // make something that sonic.js will accept
                results: {"key": "series1",
                          "color": color,
                          "values": response},
                dataSources: dataSources
            };
        }
    }
}])
;
