angular.module('stealth.common.control.openLayersModifyTrack', [
])

.factory('OpenLayersModifyTrack', [function () {
    var ModifyTrack = OpenLayers.Class(OpenLayers.Control, {
        /**
         * APIProperty: clickout
         * {Boolean} Unselect features when clicking outside any feature.
         *     Default is true.
         */
        clickout: true,

        /**
         * APIProperty: toggle
         * {Boolean} Unselect a selected feature on click.
         *      Default is true.
         */
        toggle: true,

        /**
         * Property: layer
         * {<OpenLayers.Layer.Vector>}
         */
        layer: null,

        /**
         * Property: feature
         * {<OpenLayers.Feature.Vector>} Track LineString feature.
         */
        feature: null,

        /**
         * Property: vertices
         * {Array(<OpenLayers.Feature.Vector>)} Track vertices
         */
        vertices: null,

        /**
         * Property: handlers
         * {Object}
         */
        handlers: null,

        /**
         * APIProperty: vertexRenderIntent
         * {String} The renderIntent to use for vertices. Default is null, which means
         * that the layer's default style will be used for vertices.
         */
        vertexRenderIntent: null,

        /**
         * Create a new modify track control.
         *
         * Parameters:
         * layer - {<OpenLayers.Layer.Vector>} Layer that contains features that
         *     will be modified.
         * options - {Object} Optional object whose properties will be set on the
         *     control.
         */
        initialize: function(layer, options) {
            options = options || {};
            this.layer = layer;
            this.vertices = [];
            OpenLayers.Control.prototype.initialize.apply(this, [options]);

            // configure the drag handler
            var dragCallbacks = {
                down: function(pixel) {
                    var feature = this.layer.getFeatureFromEvent(
                            this.handlers.drag.evt);
                    if (feature) {
                        this.dragStart(feature);
                    } else if (this.clickout) {
                        this._unselect = this.feature;
                    }
                },
                move: function(pixel) {
                    delete this._unselect;
                },
                up: function() {
                    this.handlers.drag.stopDown = false;
                    if (this._unselect) {
                        this.unselectFeature(this._unselect);
                        delete this._unselect;
                    }
                }
            };

            this.handlers = {
                drag: new OpenLayers.Handler.Drag(this, dragCallbacks, {stopDown: false})
            };
        },

        /**
         * APIMethod: destroy
         * Take care of things that are not handled in superclass.
         */
        destroy: function() {
            if (this.map) {
                this.map.events.un({
                    "removelayer": this.handleMapEvents,
                    "changelayer": this.handleMapEvents,
                    scope: this
                });
            }
            this.layer = null;
            OpenLayers.Control.prototype.destroy.apply(this, []);
        },

        /**
         * APIMethod: activate
         * Activate the control.
         *
         * Returns:
         * {Boolean} Successfully activated the control.
         */
        activate: function() {
            this.moveLayerToTop();
            this.map.events.on({
                "removelayer": this.handleMapEvents,
                "changelayer": this.handleMapEvents,
                scope: this
            });
            return (this.handlers.drag.activate() &&
                    OpenLayers.Control.prototype.activate.apply(this, arguments));
        },

        /**
         * APIMethod: deactivate
         * Deactivate the control.
         *
         * Returns:
         * {Boolean} Successfully deactivated the control.
         */
        deactivate: function() {
            // the return from the controls is unimportant in this case
            if(OpenLayers.Control.prototype.deactivate.apply(this, arguments)) {
                this.moveLayerBack();
                this.map.events.un({
                    "removelayer": this.handleMapEvents,
                    "changelayer": this.handleMapEvents,
                    scope: this
                });
                this.resetVertices();
                this.handlers.drag.deactivate();
                var feature = this.feature;
                if (feature && feature.geometry && feature.layer) {
                    this.unselectFeature(feature);
                }
                return true;
            }
            return false;
        },

        /**
         * APIMethod: selectFeature
         * This method is called when a feature is selected by clicking.
         *
         * Parameters:
         * feature - {<OpenLayers.Feature.Vector>} the selected feature.
         */
        selectFeature: function(feature) {
            //check if we should not select this feature
            if (this.feature === feature || //already selected
                feature.geometry.CLASS_NAME !== 'OpenLayers.Geometry.LineString' || //not a line
                !feature.attributes.pointData || //no point data
                !feature.attributes.pointData.features //no features in point data
               ) {
                return;
            }

            if (this.feature) {
                this.unselectFeature(this.feature);
            }
            this.feature = feature;
            this.layer.selectedFeatures.push(feature);
            this.layer.drawFeature(feature, 'select');
            this.resetVertices();
            this.collectVertices();
            this.events.triggerEvent('featureselected', {feature: feature});
        },

        /**
         * APIMethod: unselectFeature
         * Called when the select feature control unselects a feature.
         *
         * Parameters:
         * feature - {<OpenLayers.Feature.Vector>} The unselected feature.
         */
        unselectFeature: function(feature) {
            this.resetVertices();
            this.layer.drawFeature(this.feature, 'default');
            this.feature = null;
            OpenLayers.Util.removeItem(this.layer.selectedFeatures, feature);
            this.events.triggerEvent('featureunselected', {feature: feature});
        },


        /**
         * Method: dragStart
         * Called by the drag handler on mousedown on a feature.
         *
         * Parameters:
         * feature - {<OpenLayers.Feature.Vector>} The clicked feature
         */
        dragStart: function(feature) {
            if (!feature._sketch) {
                if (this.toggle && this.feature === feature) {
                    // mark feature for unselection
                    this._unselect = feature;
                }
                this.selectFeature(feature);
            }
        },

        /**
         * Method: resetVertices
         */
        resetVertices: function() {
            if(this.vertices.length > 0) {
                this.layer.removeFeatures(this.vertices, {silent: true});
                this.vertices = [];
            }
        },

        /**
         * Method: collectVertices
         * Collect the vertices from the track's pointData attribute and push
         *     them on to the control's vertices array.
         */
        collectVertices: function() {
            var control = this;
            function collectComponentVerticesFromPointData(geoJsonPointArr) {
                var vertex, parser = new OpenLayers.Format.GeoJSON();
                _.each(geoJsonPointArr, function (point) {
                    vertex = parser.read(point)[0];
                    vertex._sketch = true;
                    vertex.renderIntent = control.vertexRenderIntent;
                    control.vertices.push(vertex);
                }, this);
            }
            collectComponentVerticesFromPointData.call(this, this.feature.attributes.pointData.features);
            this.layer.addFeatures(this.vertices, {silent: true});
        },

        /**
         * Method: setMap
         * Set the map property for the control and all handlers.
         *
         * Parameters:
         * map - {<OpenLayers.Map>} The control's map.
         */
        setMap: function(map) {
            this.handlers.drag.setMap(map);
            OpenLayers.Control.prototype.setMap.apply(this, arguments);
        },

        /**
         * Method: handleMapEvents
         *
         * Parameters:
         * evt - {Object}
         */
        handleMapEvents: function(evt) {
            if (evt.type == "removelayer" || evt.property == "order") {
                this.moveLayerToTop();
            }
        },

        /**
         * Method: moveLayerToTop
         * Moves the layer for this handler to the top, so mouse events can reach
         * it.
         */
        moveLayerToTop: function() {
            var index = Math.max(this.map.Z_INDEX_BASE['Feature'] - 1,
                this.layer.getZIndex()) + 1;
            this.layer.setZIndex(index);

        },

        /**
         * Method: moveLayerBack
         * Moves the layer back to the position determined by the map's layers
         * array.
         */
        moveLayerBack: function() {
            var index = this.layer.getZIndex() - 1;
            if (index >= this.map.Z_INDEX_BASE['Feature']) {
                this.layer.setZIndex(index);
            } else {
                this.map.setLayerZIndex(this.layer,
                    this.map.getLayerIndex(this.layer));
            }
        }
    });

    var createControl = function (layer, options) {
        return new ModifyTrack(layer, options);
    };

    return {
        createControl: createControl
    };
}])
;
