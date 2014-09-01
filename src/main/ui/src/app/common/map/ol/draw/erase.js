angular.module('stealth.common.map.ol.draw.erase', [
])
    .directive('openlayersDrawErase', [
        function () {
            return {
                require: '^openlayersMap',
                restrict: 'E',
                link: function (scope, element, attrs, mapCtrl) {
                    var map = mapCtrl.getMap();
                    _.each(map.getControlsBy('designation', 'toolbar'), function (toolbar) {
                        toolbar.addControls([
                            new OpenLayers.Control.Button({
                                displayClass: 'openlayersDrawEraseAll',
                                title: 'Erase All Drawings',
                                trigger: function () {
                                    _.each(mapCtrl.getMap().getLayersByName('Drawings'), function (layer) {
                                        layer.destroyFeatures();
                                    });
                                }
                            })
                        ]);
                    });
                }
            };
        }
    ])
;
