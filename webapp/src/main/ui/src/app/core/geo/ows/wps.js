angular.module('stealth.core.geo.ows')

.service('wps', [
'$q',
'$http',
'$filter',
function ($q, $http, $filter) {
    this.submit = function (url, xmlRequest, omitProxy, omitWps) {
        url = $filter('cors')(url, omitWps ? '' : 'wps', omitProxy);
        var deferred = $q.defer();
        $http.post(url, xmlRequest)
            .success(function (data, status, headers, config) {
                if (_.isString(data)) {
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
    };
}])
;
