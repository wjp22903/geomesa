angular.module('stealth.core.geo.ows')

.service('owsLayers', [
'$filter',
'wms',
'stealth.core.geo.ows.KeywordExtender',
'CONFIG',
function ($filter, wms, KeywordExtender, CONFIG) {
    var _self = this;
    var _layersPromise = null;

    /**
     * Search for layers matching the keyword prefix.
     * @param {(string|string[])} keywordPrefix - passed to lodash-deep see docs
     *     https://github.com/marklagendijk/lodash-deep#propertyPath
     * @param {boolean} forceRefresh - whether or not to reload layer list from server
     *
     * @returns {Promise} Returns a list of layers matching the keyword prefix
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
                        //Extend the keywords
                        layer.KeywordConfig = _self.keywordExtender.extendKeywords(layer.KeywordConfig);
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

    /**
     * Applied to every layer's KeywordConfig
     */
    this.keywordExtender = new KeywordExtender();
}])

.factory('stealth.core.geo.ows.KeywordExtender', [
function () {
    /**
     * Container for a set of KeywordConfig extenders.
     * Extenders can add, remove, or change any part of a KeywordConfig.
     */
    var KeywordExtender = function () {
        /**
         * Internal set of extenders
         * @private
         */
        var _extenders = [];

        /**
         * Extends keywords by iterating over stored extenders.
         * @param {object} keywordConfig - obj parsed from a layer's keyword list
         *
         * @returns {object} Extended keywords
         */
        this.extendKeywords = function (keywordConfig) {
            _.each(_extenders, function (extender) {
                if (_.isFunction(extender)) {
                    keywordConfig = extender.call(this, keywordConfig);
                } else if (_.isObject(extender) && _.isFunction(extender.extendKeywords)) {
                    keywordConfig = extender.extendKeywords.call(this, keywordConfig);
                }
            });
            return keywordConfig;
        };
        /**
         * Add an extender to this container.
         * @param {(function|stealth.core.geo.ows.KeywordExtender)} extender - If function is passed,
         *    it receives a KeywordConfig and returns it in extended form.
         */
        this.addKeywordExtender = function (extender) {
            _extenders.push(extender);
        };
    };

    return KeywordExtender;
}])
;
