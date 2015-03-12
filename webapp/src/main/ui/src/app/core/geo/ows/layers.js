angular.module('stealth.core.geo.ows')

.service('owsLayers', [
'$filter',
'wms',
'CONFIG',
function ($filter, wms, CONFIG) {
    var _layersPromise = null;

    /**
     * Returns a promise with a list of layers matching the keyword prefix.
     *
     * keywordPrefix [string|Array] - passed to lodash-deep see docs
     *     https://github.com/marklagendijk/lodash-deep#propertyPath
     *
     * forceRefresh [bool] - whether or not to reload layer list from server
     */
    this.getLayers = function (keywordPrefix, forceRefresh) {
        if (forceRefresh) {
            _layersPromise = null;
        }

        if (_.isNull(_layersPromise)) {
            _layersPromise = wms.getCapabilities(CONFIG.geoserver.defaultUrl, CONFIG.geoserver.omitProxy, forceRefresh)
                .then(function (wmsCap) {
                    var layers = wmsCap.Capability.Layer.Layer;
                    _.each(CONFIG.map.extraLayers, function (layer) {
                        layers.push(layer);
                    });

                    _.each(layers, function (layer) {
                        layer.KeywordConfig = {};
                        _.eachRight(_.sortBy(layer.KeywordList), function (keyword) {
                            if (keyword.indexOf(CONFIG.app.context + '.') === 0) {
                                var parts = $filter('splitLimit')(keyword, '=', 1);
                                var path = _.rest(parts[0].split('.'));
                                if (!_.deepHas(layer.KeywordConfig, path)) {
                                    _.deepSet(layer.KeywordConfig, path, parts[1] || {});
                                }
                            }
                        });
                        delete layer.KeywordList; //we've replaced KeywordList with KeywordConfig
                        delete layer.CRS; //throw out unused CRS list
                    });
                    return layers;
                });
        }

        return _layersPromise.then(function (layers) {
            if (_.isString(keywordPrefix) || _.isArray(keywordPrefix)) {
                return _.filter(layers, function (layer) {
                    return _.deepHas(layer.KeywordConfig, keywordPrefix);
                });
            } else {
                return layers;
            }
        });
    };
}])
;
