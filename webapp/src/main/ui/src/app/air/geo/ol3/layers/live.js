angular.module('stealth.air.geo.ol3.layers')

/**
 * @returns {object} Has a getConstructor function that returns a
 *     stealth.air.geo.ol3.layers.LiveWmsLayer constructor
 */
.factory('stealth.air.geo.ol3.layers.LiveWmsLayerConstructorFactory', [
'$rootScope',
'stealth.core.utils.WidgetDef',
function ($rootScope, WidgetDef) {
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
                if (_.deepGet(_layerThisBelongsTo.KeywordConfig, 'air.live')) {
                    this.styleDirectiveScope.styleVars.iconClass = 'fa fa-fw fa-lg fa-plane';
                    this.buildSearchPointWidgetsForResponse = function (response, parentScope) {
                        if (response.isError ||
                            !_.isArray(response.records) ||
                            _.isEmpty(response.records)) {
                            return null;
                        } else {
                            return _.map(response.records, function (record, index) {
                                var s = (parentScope || $rootScope).$new();
                                s.name = response.name + ' (' + record[_.deepGet(_layerThisBelongsTo.KeywordConfig, 'capability.live.field.displayId') || 'label'] + ')';
                                s.capabilities = response.capabilities;
                                s.record = record;
                                return {
                                    //Order results by their order in records list
                                    //We could order them by distance from search coord in parent class.
                                    level: _.padLeft(_self.reverseZIndex, 4, '0') + '_' + _.padLeft(index, 4, '0'),
                                    iconClass: _self.styleDirectiveScope.styleVars.iconClass,
                                    tooltipText: s.name,
                                    widgetDef: new WidgetDef('st-live-air-wms-layer-popup', s,
                                        "name='name' capabilities='capabilities' record='record'")
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
            record: '='
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
