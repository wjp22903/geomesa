angular.module('stealth.ows.ows', [])

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
    .factory('WMS', ['$q', '$http', '$filter', 'CONFIG', function ($q, $http, $filter, CONFIG) {
        var parser = new OpenLayers.Format.WMSCapabilities(),
            capabilities = {};

        // Requests the wms capabilities from geoserver and returns a promise.
        function requestCapabilities (url) {
            return $http.get(url, {
                params: {
                    SERVICE: 'WMS',
                    REQUEST: 'GetCapabilities'
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
            getCapabilities: function (url) {
                // TODO url validation.
                var uri = $filter('endpoint')(url, 'wms');

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
    .factory('WFS', ['$q', '$http', '$filter', 'CONFIG', function ($q, $http, $filter, CONFIG) {
        var descriptions = {};

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

        function getFeature (url, typeName, paramOverrides) {
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

            return $http.get(uri, { params:  _.merge(paramDefaults, paramOverrides) });
        }

        return {
            // Requests a description for the feature type (or returns cached)
            // as a promise. (DescribeFeatureType)
            getFeatureTypeDescription: function (url, typeName) {
                // TODO - validate arguments.
                var uri = $filter('endpoint')(url, 'wfs');

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
            getFeature: function (url, typeName, paramOverrides, omitProxy) {
                // TODO validate the url.
                var uri = $filter('endpoint')(url, 'wfs', omitProxy);
                return getFeature(uri, typeName, paramOverrides);
            }
        };
    }]);

