angular.module('stealth.ows.ows', [])
    
    // TODO - move this to root module
    .constant('CONFIG', {
        geoserver: {
            url: 'http://localhost:8081/geoserver/',
            proxyHost: 'cors/'
        }
    })

    .config(['CONFIG', function (CONFIG) {
        OpenLayers.ProxyHost = CONFIG.geoserver.proxyHost;
    }])

    // Formats the url to have the specified endpoint.
    .filter('endpoint', function () {
        return function (url, pathname, omitProxy) {
            // Get the geoserver root with no trailing slash.
            var uri = url.replace(/(\/|wms|wfs)+$/, "");
            uri += '/' + pathname;
            if (!omitProxy) {
                uri = OpenLayers.ProxyHost + uri;
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

            var deferred = $q.defer();
            
            // Using open layers rather than $http because of the ProxyHost.
            OpenLayers.Request.GET({
                url: url,
                params: {
                    SERVICE: 'WMS',
                    REQUEST: 'GetCapabilities'
                },
                success: function (response) {
                    if(response && response.responseText) {
                        deferred.resolve(parser.read(response.responseText));
                    }
                },
                failure: function (response) {
                    // TODO - block other fields here
                    deferred.reject(response);
                }
            });

            return deferred.promise;
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

        var parser = new OpenLayers.Format.WFSDescribeFeatureType(),
            descriptions = {};

        // Makes a DescribeFeatureType request to GeoServer and returns a promise.
        function requestFeatureTypeDescription (url, typeName) {
            var deferred = $q.defer();
            
            // Using open layers rather than $http because of the ProxyHost.
            OpenLayers.Request.GET({
                url: url,
                params: {
                    SERVICE: 'WFS',
                    REQUEST: 'describeFeatureType',
                    TYPENAME: typeName
                },
                success: function (response) {
                    if(response && response.responseText) {
                        deferred.resolve(parser.read(response.responseText));
                    }
                },
                failure: function (response) {
                    // block other fields here
                            
                    deferred.reject(response);
                }
            });

            return deferred.promise;
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
                    descriptions[uri][typeName] = data;
                    return descriptions[uri][typeName];
                });
            },
            
            // (GetFeature)
            getFeature: function (url, typeName, paramOverrides) {
                // TODO validate the url.
                var uri = $filter('endpoint')(url, 'wfs');
                return getFeature(uri, typeName, paramOverrides);
            }
        };
    }]);

