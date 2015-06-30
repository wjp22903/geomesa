angular.module('stealth.core.geo.ows')

.service('wfs', [
'$q',
'$http',
'$filter',
function ($q, $http, $filter) {
    var _descriptionsCache = {};
    var _geomFieldsCache = {};

    var _requestFeatureTypeDescription = function (url, typeName) {
        return $http.get(url, {
            params: {
                service: 'WFS',
                version: '1.0.0',
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
            version: '1.0.0',
            request: 'GetFeature',
            typeName: typeName,
            outputFormat: 'application/json',
            srsName: 'EPSG:4326'
        };

        return $http.get(url, {
            params:  _.merge(paramDefaults, paramOverrides),
            responseType: responseType || 'text'
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

    /** According to the geoserver source code starting at:
     * https://github.com/geoserver/geoserver/blob/2.5.x/src/wfs/src/main/java/org/geoserver/wfs/json/JSONDescribeFeatureTypeResponse.java#L85
     * And the geotools API docs:
     * http://docs.geotools.org/stable/javadocs/org/opengis/feature/type/FeatureType.html#getGeometryDescriptor()
     * The default geometry attribute for a feature will be the only property that
     * has a type prefixed with 'gml:' in a JSON DescribeFeatureType response.
     */
    this.getDefaultGeometryFieldName = function (url, typeName, omitProxy, forceRefresh, omitWfs) {
        if (!forceRefresh && angular.isDefined(_geomFieldsCache[url]) &&
            angular.isDefined(_geomFieldsCache[url][typeName])) {
            return $q.when(_geomFieldsCache[url][typeName]);
        }

        return this.getFeatureTypeDescription(url, typeName, omitProxy, forceRefresh, omitWfs).then(
            function (data) {
                if (!data.error) {
                    var geomOptions = _.filter(data.featureTypes[0].properties, function (prop) {
                        return (prop.type.indexOf('gml:') !== -1);
                    });
                    if (geomOptions.length === 1) {
                        if (_.isUndefined(_geomFieldsCache[url])) {
                            _geomFieldsCache[url] = {};
                        }
                        _geomFieldsCache[url][typeName] = geomOptions[0].name;
                        return _geomFieldsCache[url][typeName];
                    }
                    return $q.reject('Could not find or uniquely identify default geometry field.');
                } else {
                    return $q.reject(data.error);
                }
            }
        );
    };
}])
;
