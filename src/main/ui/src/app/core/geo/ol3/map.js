angular.module('stealth.core.geo.ol3.map', [
    'stealth.core.geo.ol3.layers'
])

.directive('stOl3Map', [
'$interval', 'ol3Map', 'CONFIG',
function ($interval, ol3Map, CONFIG) {
    return {
        restrict: 'E',
        replace: true,
        templateUrl: 'core/geo/ol3/map.tpl.html',
        link: function (scope, element, attrs) {
            // Wait until element is displayed, then render map.
            var checkDisplay = $interval(function () {
                var display = element.css('display');
                if (display !== 'none') {
                    $interval.cancel(checkDisplay); //cancel further checks
                    ol3Map.setTarget(attrs.id);
                    ol3Map.fitExtent(ol.extent.containsExtent(CONFIG.map.initExtent, CONFIG.map.extent) ?
                            CONFIG.map.extent : CONFIG.map.initExtent);
                }
            }, 100);
        }
    };
}])

.service('ol3Map', [
'MapLayer', 'GeoJsonLayer', 'CONFIG',
function (MapLayer, GeoJsonLayer, CONFIG) {
    var _projection = 'EPSG:4326';
    var _wmsOpts = {
        // Geomesa layers currently perform better without tiling.
        // Difficult to distinguish Geomesa requests from other requests.
        // So singleTile everything.
        singleTile: true,
        format: 'image/png',
        buffer: 6, //reduce tiling effects
        time: '2000/2050',
        transparent: true
    };
    var _state = {
        zoomedToDataLayer: false,
        loading: {
            count: 0
        }
    };
    var _map = new ol.Map({
        logo: false,
        renderer: 'canvas',
        view: new ol.View({
            extent: CONFIG.map.extent,
            projection: _projection
        }),
        controls: [
            new ol.control.MousePosition({
                coordinateFormat: function (coord) {
                    var hdms = ol.coordinate.toStringHDMS(coord)
                            .replace(/([NnSs]) /, '$1:::').replace(/\s/g, '').split(':::');
                    /*jshint multistr: true */
                    var template =
                        '<table><tr>\
                             <td style="text-align:right;">DMS:</td>\
                             <td style="text-align:right;width:85px;">' + hdms[0] + '</td>\
                             <td style="text-align:right;width:95px;">' + hdms[1] + '</td>\
                             <td style="text-align:right;width:75px;">Lat/Lon:</td>\
                             <td style="text-align:right;width:68px;">{y}</td>\
                             <td style="text-align:right;width:78px;">{x}</td>\
                         </tr></table>';
                    return ol.coordinate.format(coord, template, 4);
                },
                projection: _projection
            })
        ]
    });
    var _layers = [];

    // ***** API *****
    /**
     * Assign map to an element (i.e. target).
     */
    this.setTarget = function (targetId) {
        _map.setTarget(targetId);
    };
    /**
     * Zoom map to specified extent.
     */
    this.fitExtent = function (extent) {
        _map.getView().fitExtent(
            ol.extent.containsExtent(CONFIG.map.initExtent, CONFIG.map.extent) ?
                CONFIG.map.extent : CONFIG.map.initExtent,
            _map.getSize());
    };
    /**
     * Returns array of layers currently on map (visible or not).
     */
    this.getLayers = function () {
        return _layers;
    };
    /**
     * Adds a layer to the map.
     */
    this.addLayer = function (layer, index) {
        var _ol3Layer = layer.getOl3Layer();
        if (angular.isNumber(index)) {
            _map.getLayers().insertAt(index, _ol3Layer);
            _layers.splice(index, 0, layer);
        } else {
            _map.addLayer(_ol3Layer);
            _layers.push(layer);
        }
    };

    // ***** Initialization *****
    //Built-in layers
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
    });
    var countryLayer = new ol.layer.Vector({
        source: countrySource,
        style: new ol.style.Style({
            stroke: new ol.style.Stroke({color: '#999'}),
            fill: new ol.style.Fill({color: '#202020'})
        })
    });
    this.addLayer(new GeoJsonLayer('Countries', countryLayer));
    var tintSource = new ol.source.GeoJSON({
        object: {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[-180,90],[180,90],[180,-90],[-180,-90],[-180,90]]]
            }
        }
    });
    var tintLayer = new ol.layer.Vector({
        source: tintSource,
        visible: false,
        opacity: 0.5,
        style: new ol.style.Style({
            fill: new ol.style.Fill({color: '#000'})
        })
    });
    this.addLayer(new GeoJsonLayer('Tint', tintLayer));

    //Add configured layers on top
    _.forOwn(CONFIG.map.initLayers, function (layers) {
        _.each(layers, function (layer) {
            this.addLayer(new MapLayer((layer.options || {}).name, new ol.layer.Tile(
                _.merge(layer.options || {}, {
                    source: new ol.source.TileWMS({
                        url: layer.url || CONFIG.map.defaultUrl,
                        params: _.merge(layer.getMapParams || {}, _wmsOpts)
                    })
                })
            )));
        }, this);
    }, this);
}])
;
