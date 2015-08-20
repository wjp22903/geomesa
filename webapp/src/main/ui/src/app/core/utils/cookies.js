angular.module('stealth.core.utils.cookies', [
    'ngCookies'
])

//Helpful $cookies wrapper
.service('cookies', [
'$cookies',
'CONFIG',
function ($cookies, CONFIG) {
    var buildFullKey = function (key, version) {
        return CONFIG.app.context + '.' + key + '.v' + version;
    };

    /**
     * Gets a cookie value by key and version.
     * Versions allow a key to support different formats.
     *
     * @param {string} key - cookie identifier
     * @param {number} version - format version for this key
     * @returns {*}
     */
    this.get = function (key, version) {
        return $cookies.getObject(buildFullKey(key, version));
    };

    /**
     * Saves a cookie value with key and version.
     * Versions allow a key to support different formats.
     * For example, if you want to change the data you save in a
     * cookie but use the same key, simply increment the version.
     *
     * @param {string} key - cookie identifier
     * @param {number} version - format version for this key
     * @param {*} value
     * @param {(moment|Date|string)} expires - expiration date
     *     string must be of the form "Wdy, DD Mon YYYY HH:MM:SS GMT"
     *     @see https://docs.angularjs.org/api/ngCookies/provider/$cookiesProvider#defaults
     */
    this.put = function (key, version, value, expires) {
        return $cookies.putObject(buildFullKey(key, version), value, {
            expires: moment.isMoment(expires) ? expires.toDate() :
                ((moment.isDate(expires) || _.isString(expires)) ? expires : null)
        });
    };
}])
;
