angular.module('stealth.common.map.openlayersMap', [
    'ngResource'
])

    .service('OlMapService', [function () {
        this.addWmsLayer = function (scope, lc) {
            var layer = new OpenLayers.Layer.WMS(lc.name, lc.url, {
                layers: lc.layers,
                format: 'image/png',
                transparent: true,
                cql_filter: lc.cql_filter ? lc.cql_filter : '1=1'
            }, {wrapDateLine: true});
            scope.map.addLayer(layer);
        };
    }])

    .directive('openlayersMap', ['$rootScope', 'CONFIG', 'OlMapService', function ($rootScope, CONFIG, OlMapService) {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                map: '='
            },
            template: '<div class="anchorTop anchorBottom anchorLeft anchorRight map-bg"></div>',
            link: function (scope, element, attrs) {
                scope.map = new OpenLayers.Map(attrs.id, {
                    controls: [
                        new OpenLayers.Control.ZoomPanel(),
                        new OpenLayers.Control.LayerSwitcher(),
                        new OpenLayers.Control.MousePosition(),
                        new OpenLayers.Control.NavToolbar()
                    ],
                    projection: CONFIG.map.crs,
                    layers: [
                        new OpenLayers.Layer.WMS(
                            "Base", CONFIG.map.url,
                            {layers: CONFIG.map.baseLayers, format: CONFIG.map.format},
                            {wrapDateLine: true}
                        )
                    ]
                });
                scope.map.setCenter([CONFIG.map.defaultLon, CONFIG.map.defaultLat], CONFIG.map.defaultZoom);

                $rootScope.$on("AddWmsMapLayer", function (event, lc) {
                    OlMapService.addWmsLayer(scope, lc);
                });
                $rootScope.$on("CenterPaneFullWidthChange", function (event, fullWidth) {
                    scope.map.updateSize();
                });
            }
        };
    }]);
