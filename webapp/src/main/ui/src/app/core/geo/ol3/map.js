angular.module('stealth.core.geo.ol3.map', [
    'stealth.core.geo.ol3.layers',
    'stealth.core.interaction.mappopup'
])

/**
 * Displays an OL3 map.
 */
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
        link: function (scope, element, attrs) { //eslint-disable-line no-unused-vars
            // Wait until element is displayed, then render map.
            var checkDisplay = $interval(function () {
                var display = element.css('display');
                if (display !== 'none') {
                    $interval.cancel(checkDisplay); //cancel further checks
                    ol3Map.setTarget(attrs.id);
                    ol3Map.fit(ol.extent.containsExtent(CONFIG.map.initExtent, CONFIG.map.extent) ?
                            CONFIG.map.extent : CONFIG.map.initExtent);
                }
            }, 100);
        }
    };
}])

/**
 * Wraps an OL3 map.
 */
.service('ol3Map', [
'$log',
'$filter',
'mapClickSearchService',
'stealth.core.geo.ol3.format.GeoJson',
'stealth.core.geo.ol3.layers.MapLayer',
'stealth.core.geo.ol3.layers.TintLayer',
'CONFIG',
function ($log, $filter, mapClickSearchService, GeoJson, MapLayer, TintLayer, CONFIG) {
    $log.debug('stealth.core.geo.ol3.map.ol3Map: service started');
    var _projection = CONFIG.map.projection;
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
    var updateLayerZIndices = function () {
        //Something changed the layer order.
        //Traverse the list and set the z-indices.
        _.each(_layers, function (layer, index) {
            layer.reverseZIndex = index;
        });
    };

    // ***** API *****
    /**
     * Assign map to an element (i.e. target).
     * @param {string} targetId - id attr value of target element
     */
    this.setTarget = function (targetId) {
        _map.setTarget(targetId);
    };
    /**
     * Zoom map to specified geometry or extent.
     * @param {ol.geom.SimpleGeometry|ol.Extent} geometry - Geometry or Extent to fit
     */
    this.fit = function (geometry) {
        _map.getView().fit(geometry, _map.getSize());
    };
    /**
     * Get current map extent.
     * @returns {number[]} [minLon, minLat, maxLon, maxLat]
     */
    this.getExtent = function () {
        return _map.getView().calculateExtent(_map.getSize());
    };
    /**
     * Get current map size.
     * @returns {number[]} [width, height]
     */
    this.getSize = function () {
        return _map.getSize();
    };
    /**
     * Returns array of layers currently on map (visible or not).
     * Layers are in reverse. Bottom layer at end of list.
     * @returns {stealth.core.geo.ol3.layers.MapLayer[]}
     */
    this.getLayersReversed = function () {
        return _layers;
    };
    /**
     * Get the map's ol.View.
     * @returns {ol.View}
     */
    this.getView = function () {
        return _map.getView();
    };
    /**
     * Adds a layer to the map.
     * @param {stealth.core.geo.ol3.layers.MapLayer} layer - to add
     * @param {number} [index=] - desired index for the layer
     * @returns {stealth.core.geo.ol3.layers.MapLayer} The added layer
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
        updateLayerZIndices();

        layer.searchId = mapClickSearchService.registerSearchable(function (coord, res, parentScope) {
            return layer.buildSearchPointWidgets(coord, res, parentScope);
        });
        return layer;
    };
    /**
     * Removes a layer from the map.
     * @param {stealth.core.geo.ol3.layers.MapLayer} layer - to remove
     */
    this.removeLayer = function (layer) {
        if (_.isNumber(layer.searchId)) {
            mapClickSearchService.unregisterSearchableById(layer.searchId);
            delete layer.searchId;
        }
        _map.removeLayer(layer.getOl3Layer());
        _.pull(_layers, layer);
        updateLayerZIndices();
    };
    /**
     * Removes a layer from the map by ID.
     * @param {number} id - ID of layer to remove
     */
    this.removeLayerById = function (id) {
        var layer = _.find(_layers, {id: id});
        if (layer) {
            this.removeLayer(layer);
        }
    };
    /**
     * Get layer by ID
     * @param {number} id - ID of layer to find
     * @returns {stealth.core.geo.ol3.layers.MapLayer|undefined}
     */
    this.getLayerById = function (id) {
        return _.find(_layers, {id: id});
    };
    /**
     * Move an OL3 layer on the map from index to newIndex.
     * @param {number} index - current index
     * @param {number} newIndex - new index
     */
    this.moveOl3Layer = function (index, newIndex) {
        if (index !== newIndex) {
            var layers = _map.getLayers();
            layers.insertAt(newIndex, layers.removeAt(index));
            updateLayerZIndices();
        }
    };
    /**
     * Gets the current interactions for the map.
     * @returns {ol.Collection.<ol.interaction.Interaction>} interactions
     */
    this.getInteractions = function () {
        return _map.getInteractions();
    };
    /**
     * Adds an interaction to the map.
     * @param {ol.interaction.Interaction} interaction
     */
    this.addInteraction = function (interaction) {
        _map.addInteraction(interaction);
    };
    /**
     * Removes an interaction from the map.
     * @param {ol.interaction.Interaction} interaction
     */
    this.removeInteraction = function (interaction) {
        _map.removeInteraction(interaction);
    };
    /**
     * Adds an overlay to the map.
     * @param {ol.Overlay} overlay
     */
    this.addOverlay = function (overlay) {
        _map.addOverlay(overlay);
        return overlay;
    };
    /**
     * Removes an overlay from the map.
     * @param {ol.Overlay} overlay
     */
    this.removeOverlay = function (overlay) {
        _map.removeOverlay(overlay);
    };
    /**
     * Adds a layer as an overlay to the map. The layer will not be
     * managed by the map in its layer collection.
     * @param {ol.layer.Layer} layer
     */
    this.addLayerOverlay = function (layer) {
        layer.setMap(_map);
    };
    /**
     * Remove a layer overlay from the map.
     * @param {ol.layer.Layer} layer
     */
    this.removeLayerOverlay = function (layer) {
        layer.setMap(null);
    };
    /**
     * Adds a listener to the map.
     * @param {(string|string[])} type - event type of an array of types
     * @param {function} listener - listener function
     * @param {object} opt_this - object to use as this in listener
     *
     * @returns {goog.events.Key} Unique key for listener
     */
    this.on = function (type, listener, opt_this) {
        return _map.on(type, listener, opt_this);
    };
    /**
     * Removes a listener from the map.
     * @param {(string|string[])} type - event type of an array of types
     * @param {function} listener - listener function
     * @param {object} opt_this - object used as this in listener
     */
    this.un = function (type, listener, opt_this) {
        _map.un(type, listener, opt_this);
    };
    /**
     * Removes a listener using the key returned by on()
     * @param {goog.events.Key} - listener key
     */
    this.unByKey = function (key) {
        _map.unByKey(key);
    };
    /**
     * Returns the current resolution for the map view.
     * @returns {number}
     */
    this.getResolution = function () {
        return _map.getView().getResolution();
    };
    /**
     * Returns the current center of the map view.
     * @returns {number[]} [lon, lat]
     */
    this.getCenter = function () {
        return _map.getView().getCenter();
    };

    // ***** Initialization *****
    //Built-in layers
    var countrySource = new ol.source.Vector({
        format: new GeoJson(), // stealth GeoJson, extending OL3 for STEALTH-319
        url: CONFIG.assets.path + 'countries.geo.json',
        wrapX: false
    });
    var countryLayer = new ol.layer.Vector({
        source: countrySource,
        style: new ol.style.Style({
            stroke: new ol.style.Stroke({color: '#999'}),
            fill: new ol.style.Fill({color: '#202020'})
        }),
        visible: !CONFIG.map.countriesOff
    });
    this.addLayer(new MapLayer('Countries', countryLayer, false, -20));
    this.addLayer(new TintLayer(CONFIG.map.initTint || 0));
}])

;
