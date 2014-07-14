angular.module('stealth.common.proximity', [
    'stealth.ows.ows'
])
    .service('ProximityService', ['$rootScope', '$q', '$http', '$filter', 'CONFIG', 'Utils', function ($rootScope, $q, $http, $filter, CONFIG, Utils) {
        function submitWpsRequest (geoserverUrl, req, workspace, resultLayer, resultLayerDisplayName, style, env) {
            var deferred = $q.defer();
            $http.post($filter('endpoint')(geoserverUrl, 'wps'), req)
                .success(function (data, status, headers, config) {
                    //Did server respond with layer we asked for?
                    if (data === (workspace + ':' + resultLayer)) {
                        $rootScope.$emit('ReplaceWmsMapLayers', [resultLayerDisplayName], {
                            name: resultLayerDisplayName,
                            url: $filter('endpoint')(geoserverUrl, 'wms', true),
                            layers: [data],
                            styles: style,
                            env: env,
                            addGetInfoControl: true
                        });
                        deferred.resolve();
                    } else {
                        deferred.reject('error'); //TODO - parse error from response
                    }
                })
                .error(function (data, status, headers, config) {
                    deferred.reject('error'); //TODO - show error from response
                });
            return deferred.promise;
        }

        //arg contains geoserverUrl, inputLayer, inputLayerFilter, dataLayer, dataLayerFilter, bufferMeters
        this.doLayerProximity = function (arg) {
            var resultLayer = 'proximity_' + Utils.uuid().replace(/-/g, '') + "_" + arg.dataLayer.replace(':','___'),
                templateFn = _.isEmpty(arg.inputLayerFilter) ? stealth.jst['wps/proximity_layer.xml'] : stealth.jst['wps/proximity_layer-filter.xml'],
                req = templateFn({
                    inputLayer: arg.inputLayer,
                    dataLayer: arg.dataLayer,
                    inputLayerFilter: arg.inputLayerFilter,
                    dataLayerFilter: arg.dataLayerFilter,
                    bufferMeters: arg.bufferMeters,
                    output: {
                        workspace: CONFIG.geoserver.output.workspace,
                        store: CONFIG.geoserver.output.store,
                        name: resultLayer
                    }
                });

            return submitWpsRequest(arg.geoserverUrl, req, CONFIG.geoserver.output.workspace, resultLayer, arg.dataLayer, arg.style, arg.env);
        };
        //arg contains geoserverUrl, inputLayer, inputLayerFilter, dataLayer, maxSpeedMps, maxTimeSec
        this.doTrackProximity = function (arg) {
            var resultLayer = 'proximity_' + Utils.uuid().replace(/-/g, '') + "_" + arg.dataLayer.replace(':','___'),
                templateFn = _.isEmpty(arg.inputLayerFilter) ? stealth.jst['wps/tube_layer.xml'] : stealth.jst['wps/tube_layer-filter.xml'],
                req = templateFn({
                    tubeFeatures: arg.inputLayer,
                    tubeFeatures_filter: arg.inputLayerFilter,
                    featureCollection: arg.dataLayer,
                    maxSpeedMps: arg.maxSpeedMps,
                    maxTimeSec: arg.maxTimeSec,
                    output: {
                        workspace: CONFIG.geoserver.output.workspace,
                        store: CONFIG.geoserver.output.store,
                        name: resultLayer
                    }
                });

            return submitWpsRequest(arg.geoserverUrl, req, CONFIG.geoserver.output.workspace, resultLayer, arg.dataLayer, arg.style, arg.env);
        };
    }])
;
