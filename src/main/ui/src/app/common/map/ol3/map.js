angular.module('stealth.common.map.ol3.map', [
])

    .directive(
    'ol3Map', ['$interval', 'CONFIG',
    function ($interval, CONFIG) {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                map: '='
            },
            transclude: true,
            template: '<div class="anchorAll" tabindex="-1" onclick="this.focus()">' +
                          '<div class="mapSpinner" ng-show="loading.count > 0">' +
                              '<div class="fa-stack fa-lg">' +
                                  '<i class="fa fa-spinner fa-stack-2x fa-spin"></i>' +
                                  '<span class="fa fa-stack-text fa-stack-1x">{{loading.count}}</span>' +
                              '</div>' +
                          '</div>' +
                          '<div ng-transclude></div>' +
                      '</div>',
            link: function (scope, element, attrs) {
                // Wait until element is displayed, then render map.
                var checkDisplay = $interval(function () {
                    var display = element.css('display');
                    if (display !== 'none') {
                        $interval.cancel(checkDisplay); //cancel further checks
                        scope.map.setTarget(attrs.id);
                        scope.map.getView().fitExtent(
                            ol.extent.containsExtent(CONFIG.map.initExtent, CONFIG.map.extent) ?
                                CONFIG.map.extent : CONFIG.map.initExtent,
                            scope.map.getSize());
                    }
                }, 100);
            },
            controller: function ($scope) {
                var wmsOpts = {
                    // Geomesa layers currently perform better without tiling.
                    // Difficult to distinguish Geomesa requests from other requests.
                    // So singleTile everything.
                    singleTile: true,
                    format: 'image/png',
                    buffer: 6, //reduce tiling effects
                    time: '2000/2050',
                    transparent: true
                };
                $scope.loading = {
                    count: 0
                };
                $scope.state = {
                    zoomedToDataLayer: false
                };
                $scope.map = new ol.Map({
                    view: new ol.View({
                        extent: CONFIG.map.extent,
                        projection: 'EPSG:4326'
                    }),
                    controls: [
                        new ol.control.MousePosition({
                            coordinateFormat: function (coord) {
                                var hdms = ol.coordinate.toStringHDMS(coord)
                                        .replace(/([NnSs]) /, '$1:::').replace(/\s/g, '').split(':::'),
                                    template =
                                        '<table>' +
                                            '<tr>' +
                                                '<td style="text-align:right;">DMS:</td>' +
                                                '<td style="text-align:right;width:85px;">' + hdms[0] + '</td>' +
                                                '<td style="text-align:right;width:95px;">' + hdms[1] + '</td>' +
                                                '<td style="text-align:right;width:75px;">Lat/Lon:</td>' +
                                                '<td style="text-align:right;width:68px;">{y}</td>' +
                                                '<td style="text-align:right;width:78px;">{x}</td>' +
                                            '</tr>' +
                                        '</table>';
                                return ol.coordinate.format(coord, template, 4);
                            },
                            projection: 'EPSG:4326'
                        })
                    ]
                });

                //Built-in base layer
                var countrySource = new ol.source.ServerVector({
                        format: new ol.format.GeoJSON(),
                        loader: function(extent, resolution, projection) {
                            $.ajax({
                                url: 'assets/countries.geo.json',
                                dataType: 'json'
                            }).done(function(response){
                                countrySource.addFeatures(countrySource.readFeatures(response));
                            });
                        }
                    }),
                    countryLayer = new ol.layer.Vector({
                        source: countrySource,
                        style: new ol.style.Style({
                            stroke: new ol.style.Stroke({color: '#999'}),
                            fill: new ol.style.Fill({color: '#202020'})
                        })
                    });
                $scope.map.addLayer(countryLayer);

                //Add configured layers on top
                _.forOwn(CONFIG.map.initLayers, function (layers) {
                    _.each(layers, function (layer) {
                        $scope.map.addLayer(new ol.layer.Tile(
                            _.merge(layer.options || {}, {
                                source: new ol.source.TileWMS({
                                    url: layer.url || CONFIG.map.defaultUrl,
                                    params: _.merge(layer.getMapParams || {}, wmsOpts)
                                })
                            })
                        ));
                    });
                }, this);
            }
        };
    }]);
