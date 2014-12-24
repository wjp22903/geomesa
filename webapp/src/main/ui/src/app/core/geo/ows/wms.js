angular.module('stealth.core.geo.ows')

.service('wms', [
'$q',
'$http',
'$filter',
function ($q, $http, $filter) {
    var _capabilitiesCache = {};
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
        if (!forceRefresh && angular.isDefined(_capabilitiesCache[url])) {
            return $q.when(_capabilitiesCache[url]);
        }

        return _requestCapabilities(url).then(function (data) {
            _capabilitiesCache[url] = data;
            return _capabilitiesCache[url];
        });
    };
}])
;
