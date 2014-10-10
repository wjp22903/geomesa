angular.module('stealth.ows.distinctValuesQuery', [
    'stealth.ows.ows'
])
    .factory('DistinctValuesQuery',
        ['CONFIG', 'WFS', '$rootScope',
        function (CONFIG, WFS, $rootScope) {

            var initiateQuery = function (layer, attribute, cql) {
                var url = CONFIG.geoserver.defaultUrl;
                var templateFn = stealth.jst['wps/distinct_values.xml'];
                var xmlRequest = templateFn({
                                    layer: layer,
                                    enumerate: attribute,
                                    filter: cql
                                    });
                if (CONFIG.geoserver.hasOwnProperty('omitProxy')) {
                    WFS.wpsRequest(url, xmlRequest, CONFIG.geoserver.omitProxy).then(success, failed);
                } else {
                    WFS.wpsRequest(url, xmlRequest).then(success, failed);
                }

                function success(data) {
                    var values = data.features;
                    var collection = _.map(values, function(sf) { return { value: sf.properties.value, count: sf.properties.count }; });
                    $rootScope.$emit('distinct values result', collection);
                }

                function failed(error) {
                    if (error == 'Process failed during execution java.lang.NullPointerException null') {
                        // this error gets thrown if no features match the query
                        $rootScope.$emit('distinct values result', []);
                    } else {
                        $rootScope.$emit('distinct values result', error);
                    }
                }
            };

            return {
                initiateQuery: initiateQuery
            };
        }
    ])
;
