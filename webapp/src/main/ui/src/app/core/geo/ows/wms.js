angular.module('stealth.core.geo.ows')

.service('wms', [
'$http',
'$filter',
'$q',
'toastr',
function ($http, $filter, $q, toastr) {
    var _promisesCache = {};
    var _capabilitiesParser = new ol.format.WMSCapabilities();
    var errOptions = {
        timeOut: 0,
        extendedTimeOut: 0,
        tapToDismiss: false
    };
    var waitOptions = {
        timeOut: 0,
        extendedTimeOut: 0,
        tapToDismiss: false,
        toastClass: 'waitingToast',
        iconClass: 'waitingToastIcon'
    };


    var _requestCapabilities = function (url) {
        var waitingToastr = toastr.info('Waiting for capabilities from server.', '', waitOptions);
        return $http.get(url, {
            params: {
                service: 'WMS',
                version: '1.3.0',
                request: 'GetCapabilities'
            },
            timeout: 30000
        }).then(function (response) {
            toastr.clear(waitingToastr);
            if (response && response.data) {
                // Chrome will not throw a parsing error for malformed XML, so check for a server error explicitly.
                if (response.data.indexOf('ServiceExceptionReport') !== -1) {
                    toastr.error('Server encountered an error generating capabilities. Application functionality may be degraded.',
                                 'Capabilities Error', errOptions);
                    return $q.reject('Server encountered an error generating capabilities.');
                }
                return _capabilitiesParser.read(response.data);
            } else {
                toastr.error('Failed to get capabilities from server. Application will not function properly.',
                             'Capabilities Error', errOptions);
                return $q.reject('Failed to get capabilities from server.');
            }
        }, function (reason) {
            toastr.clear(waitingToastr);
            toastr.error('Failed to get capabilities from server. Application will not function properly.',
                         'Capabilities Error', errOptions);
            return $q.reject('Failed to get capabilities from server.');
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
