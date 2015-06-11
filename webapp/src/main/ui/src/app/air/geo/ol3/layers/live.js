angular.module('stealth.air.geo.ol3.layers', [
    'stealth.core.geo.ol3.format',
    'stealth.core.geo.ol3.overlays',
    'stealth.core.geo.ows',
    'stealth.core.utils'
])

/**
 * @returns {object} Has a getConstructor function that returns a
 *     stealth.air.geo.ol3.layers.LiveWmsLayer constructor
 */
.factory('stealth.air.geo.ol3.layers.LiveWmsLayerConstructorFactory', [
'$rootScope',
'$q',
'wfs',
'highlightManager',
'stealth.core.utils.WidgetDef',
'stealth.core.geo.ol3.format.GeoJson',
'CONFIG',
function ($rootScope, $q, wfs, highlightManager, WidgetDef, GeoJson, CONFIG) {
    return {
        getConstructor: function (LiveWmsLayer) {
            /**
             * Adds "air"-specific functionality to LiveWmsLayer
             * @param {string} name - Display name
             * @param {object} requestParams - WMS params
             * @param {object} layerThisBelongsTo - Describes server layer
             * @param {boolean} [queryable] - Can this layer respond to map queries
             * @param {string} [wmsUrl] - The url to use when loading the WMS layer
             *
             * @class
             * @extends stealth.timelapse.geo.ol3.layers.LiveWmsLayer
             */
            var LiveAirWmsLayer = function (name, requestParams, layerThisBelongsTo, queryable, wmsUrl) {
                var _self = this;
                var _layerThisBelongsTo = layerThisBelongsTo;
                LiveWmsLayer.apply(this, [name, requestParams, layerThisBelongsTo, queryable, wmsUrl]);

                //Check for keyword before providing "air" functionality
                if (_.deepHas(_layerThisBelongsTo.KeywordConfig, 'air.live')) {
                    var _idField = _.deepGet(_layerThisBelongsTo.KeywordConfig, ['air', 'live', _layerThisBelongsTo.stealthWorkspace, 'idField']);
                    var _omitSearchProps = _.keys(_.deepGet(_layerThisBelongsTo.KeywordConfig, 'field.hide'));
                    var _parser = new GeoJson();
                    var _refreshRecordFeature = function (record) {
                        var queryResponse;
                        var params = {
                            featureID: record[_idField]  //specified field MUST contain the feature ID
                        };
                        if (_.isString(wmsUrl)) {
                            queryResponse = wfs.getFeature(wmsUrl.replace(/(gwc\/service\/)?wms/g, ''),
                                                           _layerThisBelongsTo.Name,
                                                           CONFIG.geoserver.omitProxy, params);
                        } else {
                            queryResponse = wfs.getFeature(CONFIG.geoserver.defaultUrl,
                                                           _layerThisBelongsTo.Name,
                                                           CONFIG.geoserver.omitProxy, params);
                        }

                        return queryResponse.then(
                            function (response) {
                                if (response.data.features.length > 0) {
                                    $rootScope.$applyAsync(function () {
                                        _.merge(record, _.omit(response.data.features[0].properties, _omitSearchProps));
                                    });
                                    return _parser.readGeometry(response.data.features[0].geometry);
                                } else {
                                    return $q.reject('No features found');
                                }
                            }
                        );
                    };

                    this.styleDirectiveScope.styleVars.iconClass = 'fa fa-fw fa-lg fa-plane';
                    this.buildSearchPointWidgetsForResponse = function (response, parentScope) {
                        if (response.isError ||
                            !_.isArray(response.records) ||
                            _.isEmpty(response.records)) {
                            return null;
                        } else {
                            return _.map(response.records, function (record, index) {
                                var highlightFeature;
                                var inOverlay = false;
                                var tabFocused = false;
                                var refreshListener = function () {
                                    _refreshRecordFeature(record).then(
                                        function (geom) {
                                            if (_.isUndefined(highlightFeature)) {
                                                highlightFeature = new ol.Feature(geom);
                                            } else {
                                                highlightFeature.setGeometry(geom);
                                            }
                                            if (!inOverlay && tabFocused) {
                                                var highlightColor = highlightManager.addFeature(highlightFeature);
                                                inOverlay = true;
                                                if (s.highlight['border-color'] !== highlightColor) {
                                                    s.$applyAsync(function () {
                                                        s.highlight = {
                                                            border: '2px solid',
                                                            'border-color': highlightColor
                                                        };
                                                    });
                                                }
                                            }
                                        }
                                    );
                                };
                                var s = (parentScope || $rootScope).$new();
                                s.name = response.name + ' (' + record[_.deepGet(_layerThisBelongsTo.KeywordConfig, 'capability.live.field.displayId') || 'label'] + ')';
                                s.capabilities = response.capabilities;
                                s.record = record;
                                s.highlight = {};
                                return {
                                    //Order results by their order in records list
                                    level: _.padLeft(_self.reverseZIndex, 4, '0') + '_' + _.padLeft(index, 4, '0'),
                                    iconClass: _self.styleDirectiveScope.styleVars.iconClass,
                                    tooltipText: s.name,
                                    widgetDef: new WidgetDef('st-live-air-wms-layer-popup', s,
                                        "name='name' capabilities='capabilities' record='record' highlight='highlight'"),
                                    onTabFocus: function () {
                                        tabFocused = true;
                                        _self.addRefreshListener(refreshListener);
                                        _self.refresh();
                                    },
                                    onTabBlur: function () {
                                        tabFocused = false;
                                        _self.removeRefreshListener(refreshListener);
                                        if (inOverlay) {
                                            highlightManager.removeFeature(highlightFeature);
                                            inOverlay = false;
                                        }
                                    }
                                };
                            });
                        }
                    };
                }
            };
            LiveAirWmsLayer.prototype = Object.create(LiveWmsLayer.prototype);

            return LiveAirWmsLayer;
        }
    };
}])

.directive('stLiveAirWmsLayerPopup', [
function () {
    return {
        restrict: 'E',
        scope: {
            name: '=',
            capabilities: '=',
            record: '=',
            highlight: '='
        },
        controller: 'liveAirPopupController',
        controllerAs: 'liveAirPopCtrl',
        templateUrl: 'air/geo/ol3/layers/livepopup.tpl.html'
    };
}])

.controller('liveAirPopupController', [
'$scope',
function ($scope) {
    $scope.group1 = {
        open: false
    };
}])
;
