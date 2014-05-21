angular.module('stealth.common.map.openlayersMap', [
    'ngResource'
])
    .factory('OlMapConfig', ['$resource', function ($resource) {
        return $resource('mapservice/basemapconf', {}, {
            query: {method: 'GET', params: {}, isArray: false}
        });
    }])

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

    .directive('openlayersMap', ['$rootScope', 'OlMapConfig', 'OlMapService', function ($rootScope, OlMapConfig, OlMapService) {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                mc: '=',
                map: '='
            },
            template: '<div class="anchorTop anchorBottom anchorLeft anchorRight map-bg"></div>',
            link: function (scope, element, attrs) {
                OlMapConfig.query().$promise.then(function (mc) {
                    scope.mc = mc;
                    scope.map = new OpenLayers.Map(attrs.id, {
                        controls: [
                            new OpenLayers.Control.ZoomPanel(),
                            new OpenLayers.Control.LayerSwitcher(),
                            new OpenLayers.Control.MousePosition(),
                            new OpenLayers.Control.NavToolbar()
                        ],
                        projection: mc.crs,
                        layers: [
                            new OpenLayers.Layer.WMS(
                                "Base", mc.url,
                                {layers: mc.baseLayers, format: mc.format},
                                {wrapDateLine: true}
                            )
                        ]
                    });
                    scope.map.setCenter([mc.centerLon, mc.centerLat], mc.defaultZoom);
                });

                $rootScope.$on("AddWmsMapLayer", function (event, lc) {
                    OlMapService.addWmsLayer(scope, lc);
                });
                $rootScope.$on("CenterPaneFullWidthChange", function (event, fullWidth) {
                    scope.map.updateSize();
                });
            }
        };
    }]);
