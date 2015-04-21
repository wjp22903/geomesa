angular.module('stealth.core.geo.ol3.map', [
    'stealth.core.geo.ol3.layers'
])

.directive('stOl3Map', [
'$log',
'$interval',
'ol3Map',
'CONFIG',
function ($log, $interval, ol3Map, CONFIG) {
    $log.debug('stealth.core.geo.ol3.map.stOl3Map: directive defined');
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
'$log',
'$filter',
'$q',
'mapClickSearchService',
'stealth.core.geo.ol3.layers.MapLayer',
'stealth.core.geo.ol3.layers.TintLayer',
'CONFIG',
function ($log, $filter, $q, mapClickSearchService, MapLayer, TintLayer, CONFIG) {
    $log.debug('stealth.core.geo.ol3.map.ol3Map: service started');
    var _projection = CONFIG.map.projection;
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
            extent: (CONFIG.map && CONFIG.map.extent) ? CONFIG.map.extent : [-180, -90, 180, 90],
            projection: _projection,
            minZoom: 2,
            maxZoom: 17
        }),
        controls: [
            new ol.control.MousePosition({
                coordinateFormat: function (coord) {
                    var dmsh = $filter('coordToDMSH')(coord);
                    var template =
                        '<table><tr>\
                             <td style="text-align:right;">DMS:</td>\
                             <td style="text-align:right;width:85px;">' + dmsh[0] + '</td>\
                             <td style="text-align:right;width:95px;">' + dmsh[1] + '</td>\
                             <td style="text-align:right;width:75px;">Lat/Lon:</td>\
                             <td style="text-align:right;width:68px;">{y}\u00b0</td>\
                             <td style="text-align:right;width:78px;">{x}\u00b0</td>\
                         </tr></table>';
                    return ol.coordinate.format(coord, template, 4);
                },
                projection: _projection
            }),
            new ol.control.ScaleLine(),
            new ol.control.Rotate(),
            new ol.control.Zoom()
        ]
    });
    //Layer list stored in reverse. Bottom layer at end of list.
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
        _map.getView().fitExtent(extent, _map.getSize());
    };
    /**
     * Get current map extent.
     */
    this.getExtent = function () {
        return _map.getView().calculateExtent(_map.getSize());
    };
    /**
     * Get current map size.
     */
    this.getSize = function () {
        return _map.getSize();
    };
    /**
     * Returns array of layers currently on map (visible or not).
     * Layers are in reverse. Bottom layer at end of list.
     */
    this.getLayersReversed = function () {
        return _layers;
    };
    /**
     * Adds a layer to the map.
     */
    this.addLayer = function (layer, index) {
        var ol3Layer = layer.getOl3Layer();
        if (!angular.isNumber(index)) {
            //Use hint to try to add layer at appropriate index.
            //If stack has been user-reordered, layer might be inserted
            //in unexpected order.
            index = _.findIndex(_layers, function (l) {
                return layer.zIndexHint >= l.zIndexHint;
            });
        }
        if (index < 0) {
            index = 0;
        } else if (index > _layers.length) {
            index = _layers.length;
        }
        _map.getLayers().insertAt(_layers.length - index, ol3Layer);
        _layers.splice(index, 0, layer);

        layer.searchId = mapClickSearchService.registerSearchable(function (coord, res) {
            if (layer.isQueryable() && ol3Layer.getVisible()) {
                return layer.searchPoint(coord, res);
            } else {
                return layer.searchPointEmpty();
            }
        });
        return layer;
    };
    /**
     * Removes a layer from the map.
     */
    this.removeLayer = function (layer) {
        if (_.isNumber(layer.searchId)) {
            mapClickSearchService.unregisterSearchableById(layer.searchId);
            delete layer.searchId;
        }
        _map.removeLayer(layer.getOl3Layer());
        _.pull(_layers, layer);
    };
    this.removeLayerById = function (id) {
        var layer = _.find(_layers, {id: id});
        if (layer) {
            this.removeLayer(layer);
        }
    };
    /**
      * Get layer by ID
      */
    this.getLayerById = function (id) {
        return _.find(_layers, {id: id});
    };
    /**
     * Move an OL3 layer on the map from index to newIndex.
     */
    this.moveOl3Layer = function (index, newIndex) {
        if (index != newIndex) {
            var layers = _map.getLayers();
            layers.insertAt(newIndex, layers.removeAt(index));
        }
    };
    /**
     * Adds an interaction to the map.
     */
    this.addInteraction = function (interaction) {
        _map.addInteraction(interaction);
    };
    /**
     * Removes an interaction from the map.
     */
    this.removeInteraction = function (interaction) {
        _map.removeInteraction(interaction);
    };
    /**
     * Adds an overlay to the map.
     */
    this.addOverlay = function (overlay) {
        _map.addOverlay(overlay);
        return overlay;
    };
    /**
     * Removes an overlay from the map.
     */
    this.removeOverlay = function (overlay) {
        _map.removeOverlay(overlay);
    };
    /**
     * Adds a listener to the map.
     */
    this.on = function (type, listener, opt_this) {
        return _map.on(type, listener, opt_this);
    };
    /**
     * Removes a listener from the map.
     */
    this.un = function (type, listener, opt_this) {
        _map.un(type, listener, opt_this);
    };
    /**
     * Removes a listener using the key returned by on() or once()
     */
    this.unByKey = function (key) {
        _map.unByKey(key);
    };
    /**
     * Returns the current resolution for the map view.
     */
    this.getResolution = function () {
        return _map.getView().getResolution();
    };

    // ***** Initialization *****
    //Built-in layers
    var countrySource = new ol.source.ServerVector({
        format: new ol.format.GeoJSON(),
        strategy: ol.loadingstrategy.all,
        loader: function(extent, resolution, projection) {
            $.ajax({
                url: CONFIG.assets.path + 'countries.geo.json',
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
    this.addLayer(new MapLayer('Countries', countryLayer, false, -20));
    this.addLayer(new TintLayer(CONFIG.map.initTint || 0));
}])

;
