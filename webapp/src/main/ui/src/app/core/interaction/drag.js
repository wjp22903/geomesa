angular.module('stealth.core.interaction.drag', [
    'stealth.core.geo.ol3.map'
])

.run([
'$log',
'ol3Map',
function ($log, ol3Map) {
    var DragInteraction = function () {
        ol.interaction.Pointer.call(this, {
            // Events are of type ol.MapBrowserEvent
            handleDownEvent: DragInteraction.prototype.getFeatureOnClick,
            handleDragEvent: DragInteraction.prototype.drag,
            //05/11/2015 - Concerned about constant cursor checks hurting performance.
            //handleMoveEvent: DragInteraction.prototype.updateCursorType,
            handleUpEvent: DragInteraction.prototype.endDrag
        });

        this._coordinate = null;  // ol.Pixel
        this._feature = null;     // ol.Feature
        this._layer = null;

        this._cursor = 'move'; // string | undefined
        this._previousCursor = undefined; // string | undefined
    };
    ol.inherits(DragInteraction, ol.interaction.Pointer);

    DragInteraction.prototype.getDraggableFeatureAndLayer = function (evt) {
        var lyr = null;
        var feature = evt.map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
            if (layer) {  //if feature is from overlay, layer=null
                lyr = layer;
                return feature;
            }
            return null;
        },
        null,
        function (layer) {
            return layer.draggable;  // The draggable property must exist and be set to 'true'.
        });

        return [feature, lyr];
    };

    DragInteraction.prototype.getFeatureOnClick = function (evt) {
        var a = this.getDraggableFeatureAndLayer(evt);

        var startDrag = !_.isUndefined(a[0]);

        if (startDrag) {
            this._coordinate = evt.coordinate;
            this._feature = a[0];
            this._layer = a[1];
        }

        return startDrag; // Return 'true' to start the drag sequence.
    };

    DragInteraction.prototype.drag = function (evt) {
        var dX = evt.coordinate[0] - this._coordinate[0];
        var dY = evt.coordinate[1] - this._coordinate[1];

        var geom = this._feature.getGeometry(); // ol.geom.SimpleGeometry
        geom.translate(dX, dY);

        this._coordinate[0] = evt.coordinate[0];
        this._coordinate[1] = evt.coordinate[1];
    };

    DragInteraction.prototype.updateCursorType = function (evt) {
        if (!_.isUndefined(this._cursor)) {
            var a = this.getDraggableFeatureAndLayer(evt);
            var element = evt.map.getTargetElement();
            if (!_.isUndefined(a[0])) {
                if (element.style.cursor != this._cursor) {
                    this._previousCursor = element.style.cursor;
                    element.style.cursor = this._cursor;
                }
            } else if (!_.isUndefined(this._previousCursor)) {
                element.style.cursor = this._previousCursor;
                this._previousCursor = undefined;
            }
        }
    };

    DragInteraction.prototype.endDrag = function (evt) {
        if (!_.isNull(this._layer) && _.isFunction(this._layer.onDragEnd)) {
            this._layer.onDragEnd(this._feature, this._layer);
        }

        this._coordinate = null;
        this._feature = null;
        this._layer = null;

        return false; // Return 'false' to stop the drag sequence.
    };

    ol3Map.addInteraction(new DragInteraction());
}])

;