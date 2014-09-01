angular.module('stealth.common.map.ol.draw.measure', [
])
    .directive('openlayersMeasure', [
        function () {
            return {
                require: '^openlayersMap',
                restrict: 'E',
                link: function (scope, element, attrs, mapCtrl) {
                    var map = mapCtrl.getMap(),
                        tooltip = element.append('<span style="position:absolute;font-weight:bold;white-space:nowrap;overflow:hidden;z-index:2000;text-shadow:-1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white, 1px 1px 0 white;"></span>')[0].firstChild,
                        tooltipMove = function (evt) {
                            tooltip.style.left = (evt.xy.x - 40) + 'px';
                            tooltip.style.top = (evt.xy.y - 30) + 'px';
                        },
                        controlOpts = {
                            persist: true,
                            geodesic: true,
                            immediate: true,
                            eventListeners: {
                                activate: function () {
                                    map.events.register('mousemove', null, tooltipMove);
                                    tooltip.innerHTML = '';
                                },
                                deactivate: function () {
                                    map.events.unregister('mousemove', null, tooltipMove);
                                    tooltip.innerHTML = '';
                                }
                            }
                        },
                        prototype = {
                            initialize: function (handler, options) {
                                OpenLayers.Control.Measure.prototype.initialize.apply(this, [handler, options]);
                                this.keyboardHandler = new OpenLayers.Handler.Keyboard(this, {
                                    keydown: this.handleKeyDown
                                }, {});
                            },
                            handleKeyDown: function (evt) {
                                var handled = false;
                                switch (evt.keyCode) {
                                    case 27: // esc
                                        tooltip.innerHTML = '';
                                        this.cancel();
                                        handled = true;
                                        break;
                                }
                                if (handled) {
                                    OpenLayers.Event.stop(evt);
                                }
                            },
                            activate: function () {
                                OpenLayers.Control.DrawFeature.prototype.activate.apply(this, arguments);
                                this.keyboardHandler.activate();
                            },
                            deactivate: function () {
                                OpenLayers.Control.DrawFeature.prototype.deactivate.apply(this, arguments);
                                this.keyboardHandler.deactivate();
                            }
                        };

                    var sketchSymbolizers = {
                        "Point": {
                            pointRadius: 6,
                            graphicName: "cross",
                            fillColor: "#cc6666",
                            fillOpacity: 0.3,
                            strokeWidth: 2,
                            strokeOpacity: 1,
                            strokeColor: "#cc6666"
                        },
                        "Line": {
                            strokeWidth: 3,
                            strokeOpacity: 1,
                            strokeColor: "#cc6666"
                        },
                        "Polygon": {
                            strokeWidth: 2,
                            strokeOpacity: 1,
                            strokeColor: "#cc6666",
                            fillColor: "#cc6666",
                            fillOpacity: 0.2
                        }
                    };
                    var style = new OpenLayers.Style();
                    style.addRules([
                        new OpenLayers.Rule({symbolizer: sketchSymbolizers})
                    ]);
                    controlOpts.handlerOptions = {
                        layerOptions: {
                            styleMap: new OpenLayers.StyleMap({"default": style})
                        }
                    };

                    _.each(map.getControlsBy('designation', 'toolbar'), function (toolbar) {
                        toolbar.addControls([
                            new (OpenLayers.Class(OpenLayers.Control.Measure, prototype))(OpenLayers.Handler.Path, _.merge({
                                displayClass: 'openlayersMeasureDistance',
                                title: 'Measure Distance',
                                eventListeners: {
                                    measurepartial: function (evt) {
                                        tooltip.innerHTML = evt.measure.toFixed(2) + ' ' + evt.units;
                                    }
                                }
                            }, controlOpts)),
                            new (OpenLayers.Class(OpenLayers.Control.Measure, prototype))(OpenLayers.Handler.Polygon, _.merge({
                                displayClass: 'openlayersMeasureArea',
                                title: 'Measure Area',
                                eventListeners: {
                                    measurepartial: function (evt) {
                                        tooltip.innerHTML = evt.measure.toFixed(2) + ' ' + evt.units + '<sup>2</sup>';
                                    }
                                }
                            }, controlOpts))
                        ]);
                    });
                }
            };
        }
    ])
;
