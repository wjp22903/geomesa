angular.module('stealth.imagery.omar.results.selection', [
    'stealth.core.geo.ol3.layers'
])

.factory('stealth.imagery.omar.results.selection.ImagerySelection', [
'$interpolate',
'ol3Map',
'stealth.core.geo.ol3.layers.WmsLayer',
function ($interpolate, ol3Map, WmsLayer) {
    var selection = function (searchScope, restartFunction) {
        var _self = this;

        var idAttribute = searchScope.params.server.idField;
        var nameAttribute = searchScope.params.server.nameField ? searchScope.params.server.nameField : idAttribute;
        var dropKeys = searchScope.params.server.dropKeys ? searchScope.params.server.dropKeys : [];
        var wkt = new ol.format.WKT();

        this.coverageLayerVisible = true;
        this.overlayFeature = null;
        this.wmsLayers = {}; // shame: using object as key/value map

        this.imageUrl = function (image) {
            return $interpolate(searchScope.params.server.imgUrl)({im: image});
        };
        this.imageName = function (image) {
            return this.getAttribute(image, nameAttribute);
        };

        // Used to be image.attribute[key], is now image.get(key), but who knows when it'll change again
        this.getAttribute = function (image, key) {
            if (key === image.getGeometryName()) {
                // angular $interpolate doesn't like image.get(geom), for whatever reason
                return wkt.writeFeature(image);
            } else {
                return image.get(key);
            }
        };
        this.filterImageAttributes = function (image) {
            return _.difference(image.getKeys(), dropKeys);
        };

        this.toggleImage = function (image) {
            var wmsLayer;
            if (image.isSelected) {
                wmsLayer = new WmsLayer({
                    name: _self.getAttribute(image, idAttribute),
                    requestParams: {
                        LAYERS: [_self.getAttribute(image, idAttribute)]
                    },
                    queryable: false,
                    zIndexHint: -5,
                    wmsUrl: searchScope.params.server.wmsUrl,
                    isTiled: false
                });
                searchScope.category.addLayer(wmsLayer);
                _self.wmsLayers[_self.getAttribute(image, idAttribute)] = wmsLayer;
                image.isVisible = true;
            } else {
                wmsLayer = _self.wmsLayers[_self.getAttribute(image, idAttribute)];
                ol3Map.removeLayer(wmsLayer);
                delete _self.wmsLayers[_self.getAttribute(image, idAttribute)];
            }
        };
        this.updateImageVis = function (image) {
            var id = _self.getAttribute(image, idAttribute);
            var wmsLayer = _self.wmsLayers[id];
            searchScope.category.toggleVisibility(wmsLayer);
        };
        this.toggleCoverage = function () {
            searchScope.category.toggleVisibility(_self.coverageLayer);
            _self.coverageLayerVisible = !_self.coverageLayerVisible;
        };

        // highlight the moused-over feature
        this.imageMouseenter = function (image) {
            if (_self.overlayFeature) {
                if (_self.overlayFeature !== image) {
                    _self.featureOverlay.removeFeature(image);
                    _self.featureOverlay.addFeature(image);
                    _self.overlayFeature = image;
                }
            } else {
                _self.featureOverlay.addFeature(image);
                _self.overlayFeature = image;
            }
        };
        this.imageMouseleave = function (image) {
            if (_self.overlayFeature === image) {
                _self.featureOverlay.removeFeature(image);
                _self.overlayFeature = null;
            }
        };

        this.zoomToCoverage = function () {
            ol3Map.fit(_self.coverageLayer.ol3Layer.getSource().getExtent());
        };
        this.zoomToImage = function (image) {
            ol3Map.fit(image.getGeometry());
        };

        this.restart = function () {
            if (_.isFunction(restartFunction)) {
                restartFunction();
            }
        };
    };

    return selection;
}])
;
