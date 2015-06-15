angular.module('stealth.core.geo.ol3.layers', [
    'stealth.core.utils'
])

.factory('stealth.core.geo.ol3.layers.WmsLayer', [
'$log',
'$timeout',
'$q',
'toastr',
'wfs',
'clickSearchHelper',
'cqlHelper',
'stealth.core.geo.ol3.layers.MapLayer',
'CONFIG',
function ($log, $timeout, $q, toastr, wfs, clickSearchHelper, cqlHelper, MapLayer, CONFIG) {
    var tag = 'stealth.core.geo.ol3.layers.WmsLayer: ';
    $log.debug(tag + 'factory started');
    /**
     * Creates a new WMS layer for displaying on the map.
     * @class
     *
     * @callback onLoad
     *
     * @param {Object} options - Properties for configuring the new WMS layer.
     * @param {string} options.name - A title for the new layer.
     * @param {Object} options.layerThisBelongsTo - GetCapabilities obj representing server layer
     * @param {Object} [options.requestParams] - An object of parameters to append to the WMS request.
     * @param {boolean} [options.queryable=false] - Whether or not the layer should allow click queries.
     * @param {number} [options.opacity=1] - The initial opacity to set the layer to. Should be between 0 and 1.
     * @param {number} [options.zIndexHint=0] - A hint for where in the layer stack to place the new layer.
     * @param {string} [options.wmsUrl] - The url to use when loading the WMS layer.
     * @param {boolean} [options.isTiled=false] - If true, load the layer in tiles using GeoWebCache. Otherwise loads as a single image.
     * @param {onLoad} [options.onLoad] - Called on each WMS image load start.
     * @param {string} [options.wfsUrl] - URL to use for WFS queries.
     * @param {boolean} [options.useProxyForWfs=false] - If true, use CORS proxy for WFS.
     */
    var WmsLayer = function (options) {
        var _options = options || {};
        var _self = this;
        var _isLoading = false;
        var _requestParams = _options.requestParams || {};
        var _isTiled = !_.isUndefined(_options.isTiled) && _options.isTiled;
        var wmsUrl = _options.wmsUrl || (CONFIG.geoserver.defaultUrl + '/wms');
        var _geomField;
        var _olSource;
        var _olLayer;
        var _layerThisBelongsTo = _options.layerThisBelongsTo;
        var _omitSearchProps = _layerThisBelongsTo ? _.keys(_.get(_layerThisBelongsTo.KeywordConfig, 'field.hide')) : [];
        var _loadStart = function () {
            _self.styleDirectiveScope.$evalAsync(function () {
                _isLoading = true;
                _self.styleDirectiveScope.$emit(_self.id + ':isLoading');
                if (_.isFunction(_options.onLoad)) {
                    _options.onLoad.call(this);
                }
            });
        };
        var _loadEnd = function () {
            _self.styleDirectiveScope.$evalAsync(function () {
                _isLoading = false;
                _self.styleDirectiveScope.$emit(_self.id + ':finishedLoading');
            });
        };
        var _getGeomField = function () {
            if (_geomField) {
                return $q.when(_geomField);
            } else {
                if (_.has(_layerThisBelongsTo.KeywordConfig, 'click.search.field.geom')) {
                    _geomField = _.get(_layerThisBelongsTo.KeywordConfig, 'click.search.field.geom');
                    return $q.when(_geomField);
                } else {
                    // No search geom field was specified so try falling back to the default geom field.
                    return wfs.getDefaultGeometryFieldName(CONFIG.geoserver.defaultUrl,
                                                           _olSource.getParams()['LAYERS'],
                                                           CONFIG.geoserver.omitProxy)
                    .then(
                        function (geomField) {
                            _geomField = geomField;
                            return geomField;
                        }
                    );
                }
            }
        };

        if (_.isUndefined(_requestParams.VERSION)) {
            _requestParams.VERSION = '1.1.1';
        }

        if (_isTiled) {
            var loadingTileCount = 0;
            _requestParams.tiled = true;
            _olSource = new ol.source.TileWMS({
                url: wmsUrl,
                params: _requestParams
            });

            _olSource.on('tileloadstart', function () {
                loadingTileCount += 1;
                _loadStart();
            });

            _olSource.on(['tileloadend', 'tileloaderror'], function () {
                loadingTileCount -= 1;
                if (loadingTileCount <= 0) {
                    loadingTileCount = 0; //zero count, just in case
                    _loadEnd();
                }
            });

            _olLayer = new ol.layer.Tile({
                source: _olSource
            });
        } else {
            _olSource = new ol.source.ImageWMS({
                ratio: 1,
                url: wmsUrl,
                params: _requestParams
            });

            _olSource.on('imageloadstart', function () {
                _loadStart();
            });

            _olSource.on(['imageloadend', 'imageloaderror'], function () {
                _loadEnd();
            });

            _olLayer = new ol.layer.Image({
                source: _olSource
            });
        }

        if (_.isNumber(_options.opacity)) {
            _olLayer.setOpacity(Math.min(Math.max(_options.opacity, 0), 1));
        }

        $log.debug(tag + 'new WmsLayer(' + arguments[0] + ')');
        MapLayer.apply(this, [_options.name, _olLayer, _options.queryable, _options.zIndexHint]);

        var getBaseCapabilities = this.getBaseCapabilities;
        this.getBaseCapabilities = function () {
            return _.merge(_.cloneDeep(getBaseCapabilities()),
                _.get(_layerThisBelongsTo, 'KeywordConfig.capability')
            );
        };

        this.updateRequestParams = function (params) {
            params.unique = _.now();
            _olSource.updateParams(params);
        };

        this.applyCql = function (cql) {
            this.updateRequestParams({
                CQL_FILTER: (_.isEmpty(cql) || _.isEmpty(cql.trim())) ? null : cql
            });
        };

        this.isLoading = function () {
            return _isLoading;
        };

        this.searchPoint = function (coord, res, requestOverrides) {
            var baseResponse = this.getEmptySearchPointResult();
            return _getGeomField().then(
                function (geomField) {
                    var queryPromise;
                    var params = {
                        'srsName': ol.proj.get(CONFIG.map.projection).getCode()
                    };
                    var clickOverrides = _.merge({geom: geomField}, clickSearchHelper.getLayerOverrides(_layerThisBelongsTo.KeywordConfig));
                    var extent = clickSearchHelper.getSearchExtent(coord, res, clickOverrides);

                    params['CQL_FILTER'] = cqlHelper.combine(cqlHelper.operator.AND, [_olSource.getParams()['CQL_FILTER'],
                                                                                      cqlHelper.buildBboxFilter(geomField, extent)]);
                    _.merge(params, requestOverrides);

                    if (_.isString(_options.wfsUrl)) {
                        queryPromise = wfs.getFeature(_options.wfsUrl,
                                                      _olSource.getParams()['LAYERS'],
                                                      !(_options.useProxyForWfs), params, 'text', true);
                    } else if (_.isString(_options.wmsUrl)) {
                        queryPromise = wfs.getFeature(_options.wmsUrl.replace(/(gwc\/service\/)?wms/g, ''),
                                                      _olSource.getParams()['LAYERS'],
                                                      !(_options.useProxyForWfs), params);
                    } else {
                        queryPromise = wfs.getFeature(CONFIG.geoserver.defaultUrl,
                                                      _olSource.getParams()['LAYERS'],
                                                      CONFIG.geoserver.omitProxy, params);
                    }
                    return queryPromise.then(function (response) {
                        var trimmedFeatures = clickSearchHelper.sortAndTrimFeatures(coord, response.data.features, clickOverrides);
                        return _.merge(baseResponse, {
                            records: _.map(_.pluck(trimmedFeatures, 'properties'), function (record) {
                                return _.omit(record, _omitSearchProps);
                            }),
                            layerFill: {
                                display: 'none'
                            }
                        });
                    }, function (response) {
                        return _.merge(baseResponse, {
                            isError: true,
                            reason: 'Server error'
                        });
                    });
                },
                function (reason) {
                    toastr.error('Failed to search ' + _options.name + '. ' + reason,
                                 'Search Error', { timeOut: 15000 });
                    return $q.when(_.merge(baseResponse, {
                        isError: true,
                        reason: reason
                    }));
                }
            );
        };
    };
    WmsLayer.prototype = Object.create(MapLayer.prototype);

    return WmsLayer;
}])

;
