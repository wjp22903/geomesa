angular.module('stealth.core.geo.ows')

.service('wfs', [
'$q',
'$http',
'$filter',
function ($q, $http, $filter) {
    var _descriptionsCache = {};
    var _capabilitiesCache = {};
    var _parser = new OpenLayers.Format.WFSCapabilities.v1_1_0_custom();

    var _requestFeatureTypeDescription = function (url, typeName) {
        return $http.get(url, {
            params: {
                service: 'WFS',
                version: '2.0.0',
                request: 'DescribeFeatureType',
                typeName: typeName,
                outputFormat: 'application/json'
            },
            timeout: 30000
        });
    };

    var _getFeature = function (url, typeName, paramOverrides, responseType) {
        var paramDefaults = {
            service: 'WFS',
            version: '2.0.0',
            request: 'GetFeature',
            typeName: typeName,
            outputFormat: 'application/json',
            srsName: 'EPSG:4326',
            count: 999999999,
            maxFeatures: 999999999
        };

        return $http.get(url, {
            params:  _.merge(paramDefaults, paramOverrides),
            responseType: responseType || 'text'
        });
    };

    var _requestCapabilities = function (url) {
        return $http.get(url, {
            params: {
                service: 'WFS',
                version: '1.1.0',
                request: 'GetCapabilities'
            },
            timeout: 30000
        }).then(function (response) {
            if (response && response.data) {
                return _parser.read(response.data);
            }
        });
    };

    this.getFeatureTypeDescription = function (url, typeName, omitProxy, forceRefresh, omitWfs) {
        url = $filter('cors')(url, omitWfs ? '' : 'wfs', omitProxy);
        if (!forceRefresh && angular.isDefined(_descriptionsCache[url]) &&
                angular.isDefined(_descriptionsCache[url][typeName])) {
            return $q.when(_descriptionsCache[url][typeName]);
        }

        return _requestFeatureTypeDescription(url, typeName)
            .then(function (data) {
                if (!angular.isDefined(_descriptionsCache[url])) {
                    _descriptionsCache[url] = {};
                }
                _descriptionsCache[url][typeName] = data.data;
                return _descriptionsCache[url][typeName];
            });
    };
    this.getFeature = function (url, typeName, omitProxy, paramOverrides, responseType, omitWfs) {
        url = $filter('cors')(url, omitWfs ? '' : 'wfs', omitProxy);
        return _getFeature(url, typeName, paramOverrides, responseType);
    };
    this.getCapabilities = function (urls, omitProxy, forceRefresh, omitWfs) {
        if (!_.isArray(urls)) {
            urls = [urls];
        }

        return $q.all(_.map(urls, function (url) {
            url = $filter('cors')(url, omitWfs ? '' : 'wfs', omitProxy);

            if(angular.isDefined(_capabilitiesCache[url])) {
                return $q.when(_capabilitiesCache[url]);
            }

            return _requestCapabilities(url).then(function (data) {
                _capabilitiesCache[url] = data;
                return _capabilitiesCache[url];
            }, function (reason) {
                return {
                    error: true,
                    reason: reason
                };
            });
        })).then(function (data) {
            //Did every request fail?
            if (_.every(data, 'error')) {
                return $q.reject(data[0].reason); //return 1st reason
            } else {
                return _.reject(data, 'error'); //return results without failures
            }
        });
    };
}])
;
