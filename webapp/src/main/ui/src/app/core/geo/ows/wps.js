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
            .success(function (data) {
                if (_.isString(data) && data.indexOf('ExceptionText') !== -1) {
                    try {
                        var r = /<ows:ExceptionText>(.*)<\/ows:ExceptionText>/;
                        var ex = r.exec(data.replace(/(\r\n|\r|\n)/g, ' '));
                        if (_.isArray(ex) && ex.length > 1) {
                            deferred.reject(ex[1]);
                        }
                    } catch(e) {
                        console.log(data, e);
                        deferred.reject('An error occurred');
                    }
                }
                deferred.resolve(data);
            })
            .error(function (data, status) { //eslint-disable-line no-unused-vars
                deferred.reject('Error: ' + status);
            });
        return deferred.promise;
    };
}])
;
