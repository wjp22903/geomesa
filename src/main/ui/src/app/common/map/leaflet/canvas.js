angular.module('stealth.common.map.leaflet.canvas', [
    'stealth.common.layermanager.leaflet.layerManager',
    'stealth.common.utils'
])

.factory('CanvasFactory', [ function () {

    var Canvas = function (drawFunction) {
        var overlay = L.canvasOverlay().drawing(drawFunction);
        return overlay;
    };

    var _createCanvas = function (drawFunction) {
        return new Canvas(drawFunction);
    };

    return {
        createCanvas: _createCanvas
    };
}])

.service('CanvasDrawingService', [
    '$rootScope', 'LayerManager', 'Utils',
    function ($rootScope, LayerManager, Utils) {

        // Private Members
        // Drawing bounds.
        var _w, _h, _wImage, _hImage,
            _border = 5,
            _bounds = {
                north: null,
                south: null,
                east: null,
                west: null
            },
            _lonFactor = 1.0,
            _latFactor = 1.0;

        // Canvas references.
        var _canvasOverlay = null,
            _context = null;

        // Time restrictions for drawing.
        var _drawTimestamp = 0,
            _drawFollowMin = 0;

        // Image data storage.
        var _dataLen = 32,
            _buf = new ArrayBuffer(_dataLen),
            _buf8,
            _data = new Uint32Array(_buf),
            _imageData,
            _isLittleEndian = true;

            // Determine whether Uint32 is little- or big-endian.
            _data[1] = 0x0a0b0c0d;
            if (_buf[4] === 0x0a &&
                _buf[5] === 0x0b &&
                _buf[6] === 0x0c &&
                _buf[7] === 0x0d) {
                _isLittleEndian = false;
            }

        // Styling parameters.
        var _nDiv = 10 | 0,  // Number of divisions for styling.
            _alpha = new Uint8Array(_nDiv + 1),
            _nColors = Utils.webSafeColors.length,
            _colorsInts = [],
            _colorsArrays = [];

            // Preset alpha fading.
            _alpha[0] = 0x00;
            _alpha[_nDiv] = 0xff;
            _makeLinearRamp(_alpha, 0, _nDiv);

            // Preload colors for drawing.
            _.each(Utils.webSafeColors, function (str) {
                _colorsInts.push(parseInt(str.substring(1), 16));
            });
            _.each(_colorsInts, function (i) {
                _colorsArrays.push(_hexToRgbArray(i));
            });

        // Temporary drawing storage.
        var _x, _y, _z,
            _styleColor = 0,
            _hexColor = 0,
            _color = 0,
            _rgba,
            _center, _left, _top, _bottom,
            _radius = new Uint32Array(_nDiv + 1);

        // Misc.
        var _toggle = false,
            _textNode = document.createTextNode('&nbsp;');

        // Private Methods
        function _drawCircle (buffer, w, bufLen, center, radius, value) {
            var x2, y2,
                r2 = radius * radius;
            for (var y=-radius; y<radius+1; ++y) {
                y2 = y * y;
                for (var x=-radius; x<radius+1; ++x) {
                    x2 = x * x;
                    if (x2 + y2 < r2+1) {
                        var pixel = center + y*w + x;
                        if (0 < pixel && pixel < bufLen) {
                            buffer[pixel] = value;
                        }
                    }
                }
            }
        }

        // Older Firefoxes (< 23?) need an extra hack to redraw canvas
        function _forceCanvasRedraw (canvas) {
            if (bowser.firefox && bowser.version < 23) {
                _toggle = !_toggle;
                if (_toggle) {canvas.appendChild(_textNode);}
                else {canvas.removeChild(_textNode);}
            }
        }

        function _clearImage() {
            "use asm";    // will be ignored
            var z = _data;
            var zn = z.length|0;
            var i = 0|0;
            // This clears the border too which isn't necessary but may make it
            // easier for the JIT compiler to lift the [i] bounds check out of the
            // loop.
            for (; (i|0) < (zn|0); i = (i+1)|0) {
                z[i] = 0;
            }
        }

        // From x[i] to x[j], fill in all elements with a linear ramp.
        function _makeLinearRamp (x, i, j) {
            var k = (j-i) >> 1;
            if (k<1) {
                return;
            }
            x[i+k] = x[i] + ((x[j] - x[i]) >> 1); // Protect against overflow

            _makeLinearRamp(x, i, i+k);
            _makeLinearRamp(x, i+k, j);
        }

        function _hexToRgbArray (hexColor) {
            return [ hexColor >> 16,
                     hexColor >> 8 & 0xFF,
                     hexColor & 0xFF ];
        }

        function _drawObsLayer0 (layer, begIdx, endIdx) {

            _radius[0] = 0;
            _radius[_nDiv] = layer.style.weight;
            _makeLinearRamp(_radius, 0, _nDiv);

            var nDivIdx = ((endIdx - begIdx) / _nDiv) | 0;

            var idView = layer.store.idView;
            var latView = layer.store.latView;
            var lonView = layer.store.lonView;
            var south = _bounds.south;
            var north = _bounds.north;
            var west = _bounds.west;
            var east = _bounds.east;
            var stride = layer.store.stride;
            var colorById = layer.style.colorById;

            _styleColor = parseInt(layer.style.color.substring(1), 16);
            _color = _hexToRgbArray(_styleColor);
            for (var i = begIdx; i < endIdx; i += stride) {
                if (latView[i] > south && latView[i] < north &&
                    lonView[i] > west  && lonView[i] < east)
                {
                    if (colorById) {
                        _color = _colorsArrays[idView[i] % _nColors];
                    }
                    var iDiv = ((i - begIdx) / nDivIdx) | 0;
                    _x = ((lonView[i] - west) * _lonFactor) | 0;
                    _y = ((north - latView[i]) * _latFactor) | 0;
                    _center = _y*_w + _x;

                    if (_isLittleEndian) {
                        _rgba =
                            (_alpha[iDiv] << 24) | // alpha
                            (_color[2]    << 16) | // blue
                            (_color[1]    <<  8) | // green
                             _color[0];            // red
                    } else {
                        _rgba =
                            (_color[0] << 24) | // red
                            (_color[1] << 16) | // green
                            (_color[2] <<  8) | // blue
                             _alpha[iDiv];      // alpha
                    }

                    _drawCircle(_data, _w, _dataLen, _center, _radius[iDiv], _rgba);
                }
            }
        }

        // Public Methods
        this.setMapState = function (state) {
            // Some browsers use non-integral sizes so use upper bound.
            _z = Math.ceil(state.mapZoom);
            _w = Math.ceil(state.mapWidth );
            _h = Math.ceil(state.mapHeight);
            _bounds.north = state.mapBounds.getNorth();
            _bounds.south = state.mapBounds.getSouth();
            _bounds.east = state.mapBounds.getEast();
            _bounds.west = state.mapBounds.getWest();
            _lonFactor = _w / (_bounds.east - _bounds.west);
            _latFactor = _h / (_bounds.north - _bounds.south);
            _wImage = _w;
            _hImage = _h;
            _dataLen = _wImage * _hImage * 4;
            _buf = new ArrayBuffer(_dataLen);    // 4-bytes (RGBA) per pixel
            _buf8 = new Uint8ClampedArray(_buf);
            _data = new Uint32Array(_buf);
            _imageData = _context.createImageData(_wImage, _hImage);
        };

        this.getDrawFunction = function (index) {
            var callback;
            switch (index) {
                case 0:
                    callback = _drawObsLayer0;
                    break;
                default:
                    callback = _drawObsLayer0;
            }

            var draw = function (canvasOverlay, params) {
                _canvasOverlay = canvasOverlay;
                _context = _canvasOverlay.canvas().getContext('2d');

                if (_imageData) {
                    _clearImage();

                    LayerManager.drawLayers(_drawTimestamp, _drawFollowMin, callback);

                    _imageData.data.set(_buf8);
                    _context.putImageData(_imageData, 0, 0);
                }
                _forceCanvasRedraw(_canvasOverlay.canvas());
            };

            return draw;
        };

        this.redraw = function (curTimestamp, curFollowMin) {
            _drawTimestamp = curTimestamp;
            _drawFollowMin = curFollowMin;
            if (_canvasOverlay) {
                _canvasOverlay.redraw();
            }
        };

        // Subscribe
        $rootScope.$on('Redraw Layers', function(e) {
            if (_canvasOverlay) {
                _canvasOverlay.redraw();
            }
        });
    }
]);
