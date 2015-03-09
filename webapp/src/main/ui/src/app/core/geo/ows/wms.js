angular.module('stealth.core.geo.ows')

.service('wms', [
'$http',
'$filter',
function ($http, $filter) {
    var _promisesCache = {};
    var _capabilitiesParser = new ol.format.WMSCapabilities();

    var _requestCapabilities = function (url) {
        return $http.get(url, {
            params: {
                service: 'WMS',
                version: '1.3.0',
                request: 'GetCapabilities'
            },
            timeout: 30000
        }).then(function (response) {
            if (response && response.data) {
                return _capabilitiesParser.read(response.data);
            }
        });
    };

    this.getCapabilities = function (url, omitProxy, forceRefresh, omitWms) {
        url = $filter('cors')(url, omitWms ? '' : 'wms', omitProxy);

        if (forceRefresh && angular.isDefined(_promisesCache)) {
            delete _promisesCache[url];
        }

        if (!angular.isDefined(_promisesCache[url])) {
            _promisesCache[url] =_requestCapabilities(url).then(function (data) { return data; });
        }

        return _promisesCache[url];
    };
}])
;
