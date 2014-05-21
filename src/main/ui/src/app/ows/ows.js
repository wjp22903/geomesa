angular.module('stealth.ows.ows', [])
    
    // TODO - move this to root module
    .constant('CONFIG', {
        geoserver: {
            url: 'http://localhost:8081/geoserver/',
            proxyHost: 'cors/'
        }
    })

    .config(function () {
        // TODO - this should be set in the application config as a constant
        // and injected into this module.
        OpenLayers.ProxyHost = "cors/";
    })

    .factory('WMS', ['$q', '$http', 'CONFIG', function ($q, $http, CONFIG) {
        
        var parser = new OpenLayers.Format.WMSCapabilities(),
            capabilities;
        
        // Requests the wms capabilities from geoserver and returns a promise.
        function requestCapabilities () {
            var deferred = $q.defer();
            
            // Using open layers rather than $http because of the ProxyHost.
            OpenLayers.Request.GET({
                url: CONFIG.geoserver.url + 'wms',
                params: {
                    SERVICE: 'WMS',
                    REQUEST: 'GetCapabilities'
                },
                success: function (response) {
                    if(response && response.responseText) {
                        deferred.resolve(parser.read(response.responseText));
                    }
                }
            });

            return deferred.promise;
        }

        return {
            // Requests capabilities (or returns the cached version) as a promise.
            getCapabilities: function () {
                if(angular.isDefined(capabilities)) {
                    return $q.when(capabilities);
                }

                return requestCapabilities().then(function (data) {
                    capabilities = data;
                    return capabilities;
                });
            }
        };
    }]);
