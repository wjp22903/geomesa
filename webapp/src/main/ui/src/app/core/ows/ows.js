angular.module('stealth.core.ows', [
])

// Formats the url to have the specified endpoint.
.filter('endpoint', function () {
    return function (url, pathname, omitProxy) {
        // Get the geoserver root with no trailing slash.
        var uri = url.replace(/(\/|wms|wfs)+$/, "");
        uri += '/' + pathname;
        if (!omitProxy) {
            uri = 'cors/' + uri;
        }
        return uri;
    };
})

// WMS Utilities
.factory('WMS', ['$q', '$http', '$filter', function ($q, $http, $filter) {
    var parser = new OpenLayers.Format.WMSCapabilities.v1_3_0(),
        capabilities = {};

    // Requests the wms capabilities from geoserver and returns a promise.
    function requestCapabilities (url) {
        return $http.get(url, {
            params: {
                service: 'WMS',
                version: '1.3.0',
                request: 'GetCapabilities'
            },
            timeout: 30000
        }).then(function (response) {
            if (response && response.data) {
                return parser.read(response.data);
            }
        });
    }

    return {
        // Requests capabilities (or returns the cached version) as a promise.
        getCapabilities: function (url, omitProxy) {
            // TODO url validation.
            var uri = $filter('endpoint')(url, 'wms', omitProxy);

            if(angular.isDefined(capabilities[uri])) {
                return $q.when(capabilities[uri]);
            }

            return requestCapabilities(uri).then(function (data) {
                capabilities[uri] = data;
                return capabilities[uri];
            });
        }
    };
}])

// WFS Utilities.
.factory('WFS', ['$q', '$http', '$filter', function ($q, $http, $filter) {
    var descriptions = {},
        parser = new OpenLayers.Format.WFSCapabilities.v1_1_0_custom(),
        capabilities = {},
        cqlFormat = new OpenLayers.Format.CQL(),
        filter_1_1 = new OpenLayers.Format.Filter({ version: '1.1.0', srsName: 'EPSG:4326' }), // 1.1.0 spec filter
        xmlFormat = new OpenLayers.Format.XML();

    // Requests the WFS capabilities from geoserver and returns a promise.
    function requestCapabilities (url) {
        return $http.get(url, {
            params: {
                service: 'WFS',
                version: '1.1.0',
                request: 'GetCapabilities'
            },
            timeout: 30000
        }).then(function (response) {
            if (response && response.data) {
                return parser.read(response.data);
            }
        });
    }

    // Makes a DescribeFeatureType request to GeoServer and returns a promise.
    function requestFeatureTypeDescription (url, typeName) {
        return $http.get(url, {
            params: {
                service: 'WFS',
                version: '2.0.0',
                request: 'DescribeFeatureType',
                typeName: typeName,
                outputFormat: 'application/json'
            },
            timeout: 30000
        });
    }

    function getFeature (url, typeName, paramOverrides, responseType) {
        // TODO - validate arguments.
        var uri = url,
            paramDefaults = {
                service: 'WFS',
                version: '2.0.0',
                request: 'GetFeature',
                typeName: typeName,
                outputFormat: 'application/json',
                srsName: 'EPSG:4326'
            };

        return $http.get(uri, { params:  _.merge(paramDefaults, paramOverrides), responseType: responseType || "text" });
    }

    function wpsRequest (url, xmlRequest) {
        var deferred = $q.defer();
        $http({ method: 'POST', 'url': url, data: xmlRequest, headers: { 'Content-Type': 'text/xml' } })
            .success(function (data, status, headers, config) {
                if (_.isString(data)) {
                    // exception report
                    // <ows:ExceptionText>Process failed during execution java.lang.ArrayIndexOutOfBoundsException null</ows:ExceptionText>
                    try {
                        var r = /<ows:ExceptionText>(.*)<\/ows:ExceptionText>/;
                        var ex = r.exec(data.replace(/(\r\n|\r|\n)/g, ' '))[1];
                        deferred.reject(ex);
                    } catch(e) {
                        console.log(data, e);
                        deferred.reject('An error occurred');
                    }
                } else {
                    deferred.resolve(data);
                }
            })
            .error(function (data, status, headers, config) {
                deferred.reject('Error: ' + status);
            });
        return deferred.promise;
    }

    function cqlToFilterXml(cql) {
        // convert our cql string into a filter object
        var filter = cqlFormat.read(cql);
        // convert to xml
        return xmlFormat.write(filter_1_1.write(filter));
    }

    return {
        // Requests a description for the feature type (or returns cached)
        // as a promise. (DescribeFeatureType)
        getFeatureTypeDescription: function (url, typeName, omitProxy) {
            // TODO - validate arguments.
            var uri = $filter('endpoint')(url, 'wfs', omitProxy);

            // Return cached if it exists.
            if (angular.isDefined(descriptions[uri])) {
                if (angular.isDefined(descriptions[uri][typeName])) {
                    return $q.when(descriptions[uri][typeName]);
                }
            }

            return requestFeatureTypeDescription(uri, typeName).then(function (data) {
                if (!angular.isDefined(descriptions[uri])) {
                    descriptions[uri] = {};
                }
                descriptions[uri][typeName] = data.data;
                return descriptions[uri][typeName];
            });
        },

        // (GetFeature)
        getFeature: function (url,
                              typeName,
                              paramOverrides,
                              responseType,
                              omitProxy) {
            // TODO validate the url.
            var uri = $filter('endpoint')(url, 'wfs', omitProxy);
            return getFeature(uri, typeName, paramOverrides, responseType);
        },

        // Requests capabilities (or returns the cached version) as a promise.
        getCapabilities: function (urls, omitProxy) {
            if (!_.isArray(urls)) {
                urls = [urls];
            }

            return $q.all(_.map(urls, function (url) {
                var uri = $filter('endpoint')(url, 'wfs', omitProxy);

                if(angular.isDefined(capabilities[uri])) {
                    return $q.when(capabilities[uri]);
                }

                return requestCapabilities(uri).then(function (data) {
                    capabilities[uri] = data;
                    return capabilities[uri];
                }, function (reason) {
                    return {
                        error: true,
                        reason: reason
                    };
                });
            })).then(function (data) {
                //Did every request fail?
                if (_.every(data, 'error')) {
                    return $q.reject(data[0].reason); //return 1st reason
                } else {
                    return _.reject(data, 'error'); //return results without failures
                }
            });
        },

        wpsRequest: function(url, xmlRequest, omitProxy) {
            // TODO validate the url.
            var uri = $filter('endpoint')(url, 'wfs', omitProxy);
            return wpsRequest(uri, xmlRequest);
        },

        cqlToFilterXml: function (cql) {
            return cqlToFilterXml(cql);
        }
    };
}])
;
