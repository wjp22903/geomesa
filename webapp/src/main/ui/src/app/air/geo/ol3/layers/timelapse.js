angular.module('stealth.air.geo.ol3.layers', [
    'ccri.angular-utils'
])

.factory('stealth.air.geo.ol3.layers.TimeLapseLayerConstructorFactory', [
'$rootScope',
'ccri.angular-utils.WidgetDef',
function ($rootScope, WidgetDef) {
    return {
        getConstructor: function (TimeLapseLayer) {
            var AirTimeLapseLayer = function (/* inherited */) {
                var _self = this;
                TimeLapseLayer.apply(this, arguments);

                var buildSearchPointWidgetsForResponse = this.buildSearchPointWidgetsForResponse;
                this.buildSearchPointWidgetsForResponse = function (response, parentScope) {
                    if (response.isError ||
                        !_.isArray(response.records) ||
                        _.isEmpty(response.records)) {
                        return null;
                    } else {
                        var widgets = [];

                        //Create an "air" widget for every record in a response with correct type identifier.
                        if (response.stealthType === 'stealth.air') {
                            widgets = _.map(response.records, function (record, index) {
                                var s = (parentScope || $rootScope).$new();
                                s.name = response.name;
                                s.capabilities = response.capabilities;
                                s.record = record;
                                return {
                                    //Order results by their order in records list
                                    level: _.padLeft(_self.reverseZIndex, 4, '0') + (response.levelSuffix || '') + '_' + _.padLeft(index, 4, '0'),
                                    iconClass: _self.styleDirectiveScope.styleVars.iconClass,
                                    tooltipText: s.name,
                                    widgetDef: new WidgetDef({
                                        tag: 'st-live-air-wms-layer-popup',
                                        scope: s,
                                        attrs: "name='name' capabilities='capabilities' record='record'"
                                    })
                                };
                            });
                        } else { //Have parent create widget(s) for response.
                            widgets.push(buildSearchPointWidgetsForResponse.call(this, response, parentScope));
                        }

                        return widgets;
                    }
                };
            };
            AirTimeLapseLayer.prototype = Object.create(TimeLapseLayer.prototype);

            return AirTimeLapseLayer;
        }
    };
}])
;
