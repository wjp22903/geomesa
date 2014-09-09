angular.module('stealth.common.control.airTrackerLayersControl', [

])

.factory('AirTrackerLayers', [ function () {
    // Custom checkbox control to allow users to switch between
    // different layers on the map.
    // Copied from leaflet-src.js and modified.
    var AirTrackerLayerControl = L.Control.extend({
        options: {
            collapsed: true,
            position: 'topright',
            autoZIndex: true
        },

        initialize: function (baseLayers, overlays, colors, options) {
            L.setOptions(this, options);

            this._layers = {};
            this._overlays = [];
            this._lastZIndex = 0;
            this._handlingClick = false;
            this._layerColors = colors;
            this._buttonClickedId = 0;

            for (var i in baseLayers) {
                this._addLayer(baseLayers[i], i, false, null, false);
            }

            for (i in overlays) {
                this._addLayer(overlays[i], i, true, colors[i], false);
            }
        },

        onAdd: function (map) {
            this._initLayout();
            this._update();

            map
            .on('layeradd', this._onLayerChange, this)
            .on('layerremove', this._onLayerChange, this);

            return this._container;
        },

        onRemove: function (map) {
            map
            .off('layeradd', this._onLayerChange)
            .off('layerremove', this._onLayerChange);
        },

        addBaseLayer: function (layer, name) {
            this._addLayer(layer, name, false, null, true);
            this._update();
            return this;
        },

        addOverlay: function (layer, name, color) {
            this._addLayer(layer, name, true, color, true);
            this._update();
            return this;
        },

        removeLayer: function (layer) {
            var id = L.stamp(layer);
            delete this._layers[id];
            this._update();
            return this;
        },

        _initLayout: function () {
            var className = 'leaflet-control-layers';
            var container = this._container =
                L.DomUtil.create('div',
                                 'air-tracker-control air-tracker-layers-control ' +
                                 className);

            // Makes this work on IE10 Touch devices by stopping it from firing
            // a mouseout event when the touch is released
            container.setAttribute('aria-haspopup', true);

            if (!L.Browser.touch) {
                L.DomEvent
                .disableClickPropagation(container)
                .disableScrollPropagation(container);
            } else {
                L.DomEvent.on(container, 'click', L.DomEvent.stopPropagation);
            }

            var form = this._form = L.DomUtil.create('form', className + '-list');

            if (this.options.collapsed) {
                if (!L.Browser.android) {
                    L.DomEvent
                    .on(container, 'mouseover', this._expand, this)
                    .on(container, 'mouseout', this._collapse, this);
                }
                var link = this._layersLink =
                    L.DomUtil.create('a', className + '-toggle', container);
                link.href = '#';
                link.title = 'Layers';

                if (L.Browser.touch) {
                    L.DomEvent
                    .on(link, 'click', L.DomEvent.stop)
                    .on(link, 'click', this._expand, this);
                }
                else {
                    L.DomEvent.on(link, 'focus', this._expand, this);
                }
                // Work around for Firefox android issue
                // https://github.com/Leaflet/Leaflet/issues/2033
                L.DomEvent.on(form, 'click', function () {
                    setTimeout(L.bind(this._onInputClick, this), 0);
                }, this);

                this._map.on('click', this._collapse, this);
                // TODO keyboard accessibility
            } else {
                this._expand();
            }

            this._baseLayersList = L.DomUtil.create('div', className + '-base', form);
            this._separator = L.DomUtil.create('div', className + '-separator', form);
            this._overlaysList = L.DomUtil.create('div', className + '-overlays', form);

            container.appendChild(form);
        },

        _addLayer: function (layer, name, isOverlay, color, isRemovable) {
            var id = L.stamp(layer);

            this._layers[id] = {
                layer: layer,
                name: name,
                isOverlay: isOverlay,
                color: color,
                isRemovable: isRemovable
            };

            if (isOverlay) {
                this._overlays.push(this._layers[id]);
            }

            if (this.options.autoZIndex && layer.setZIndex) {
                this._lastZIndex++;
                layer.setZIndex(this._lastZIndex);
            }
        },

        _update: function () {
            if (!this._container) {
                return;
            }

            this._baseLayersList.innerHTML = '';
            this._overlaysList.innerHTML = '';

            var baseLayersPresent = false,
                overlaysPresent = false,
                i, obj;

            for (i in this._layers) {
                obj = this._layers[i];
                this._addItem(obj);
                overlaysPresent = overlaysPresent || obj.isOverlay;
                baseLayersPresent = baseLayersPresent || !obj.isOverlay;
            }

            this._separator.style.display = overlaysPresent && baseLayersPresent ? '' : 'none';
        },

        _onLayerChange: function (e) {
            var obj = this._layers[L.stamp(e.layer)];

            if (!obj) { return; }

            if (!this._handlingClick) {
                this._update();
            }

            var type = obj.isOverlay ?
                (e.type === 'layeradd' ? 'overlayadd' : 'overlayremove') :
            (e.type === 'layeradd' ? 'baselayerchange' : null);

            if (type) {
                this._map.fire(type, obj);
            }
        },

        // IE7 bugs out if you create a radio dynamically, so you have to do
        // it this hacky way (see http://bit.ly/PqYLBe)
        _createRadioElement: function (name, checked) {

            var radioHtml =
                '<input type="radio" class="leaflet-control-layers-selector" name="' +
                name + '"';
            if (checked) {
                radioHtml += ' checked="checked"';
            }
            radioHtml += '/>';

            var radioFragment = document.createElement('div');
            radioFragment.innerHTML = radioHtml;

            return radioFragment.firstChild;
        },

        _addItem: function (obj) {
            var label = document.createElement('label'),
                input,
                checked = this._map.hasLayer(obj.layer);

            if (obj.isOverlay) {
                input = document.createElement('input');
                input.type = 'checkbox';
                input.className = 'leaflet-control-layers-selector';
                input.defaultChecked = checked;
            } else {
                input = this._createRadioElement('leaflet-base-layers', checked);
            }

            input.layerId = L.stamp(obj.layer);

            L.DomEvent.on(input, 'click', this._onInputClick, this);

            var name = document.createElement('span');
            name.innerHTML = ' ' + obj.name + ' ';

            var colorCard = L.DomUtil.create('i', 'legend');
            colorCard.innerHTML += '<i style="background:' + obj.color + '"></i>';

            var removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.setAttribute('id', obj.layer._leaflet_id);
            removeButton.innerHTML += 'x';
            L.DomEvent.on(removeButton, 'click', this._onRemoveClick, this);

            label.appendChild(input);
            if (obj.isOverlay) {
                label.appendChild(colorCard);
            }
            label.appendChild(name);
            if (obj.isRemovable && obj.isOverlay) {
                label.appendChild(removeButton);
            }

            var container = obj.isOverlay ? this._overlaysList : this._baseLayersList;
            container.appendChild(label);

            return label;
        },

        _onInputClick: function () {
            var i, input, obj,
                inputs = this._form.getElementsByTagName('input'),
                inputsLen = inputs.length;

            this._handlingClick = true;

            for (i = 0; i < inputsLen; i++) {
                input = inputs[i];
                obj = this._layers[input.layerId];

                if (input.checked && !this._map.hasLayer(obj.layer)) {
                    this._map.addLayer(obj.layer);

                } else if (!input.checked && this._map.hasLayer(obj.layer)) {
                    this._map.removeLayer(obj.layer);
                }
            }

            this._handlingClick = false;

            this._refocusOnMap();
        },

        _onRemoveClick: function (button) {

            this._handlingClick = true;

            var id = button.target.id;
            var obj = this._layers[id];
            this._map.removeLayer(obj.layer);
            delete this._layers[id];
            this._update();

            this._handlingClick = false;
        },

        _expand: function () {
            L.DomUtil.addClass(this._container,
                               'leaflet-control-layers-expanded');
        },

        _collapse: function () {
            this._container.className = this._container.className.replace(' leaflet-control-layers-expanded', '');
        },

        getOverlays: function () {
            return this._overlays;
        }
    });

    var createControl = function (baseLayers, overlays, colors, options) {
        return new AirTrackerLayerControl(baseLayers, overlays, colors, options);
    };

    return {
        createControl: createControl
    };
}])
;
