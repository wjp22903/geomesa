angular.module('stealth.timelapse.geo.ol3.layers', [
    'stealth.core.geo.ol3.layers'
])

.factory('stealth.timelapse.geo.ol3.layers.TimeLapseLayer', [
'$log',
'$rootScope',
'stealth.core.geo.ol3.layers.MapLayer',
'CONFIG',
function ($log, $rootScope, MapLayer, CONFIG) {
    var tag = 'stealth.timelapse.geo.ol3.layers.TimeLapseLayer: ';
    $log.debug(tag + 'factory started');

    var _nDiv = 10 | 0;  // Number of divisions for styling.
    var _radiusRamps = _.map(_.range(1, 101), function (max) {
        var radius = new Uint32Array(_nDiv + 1);
        radius[0] = 1;
        radius[_nDiv] = max;
        makeLinearRamp(radius, 0, _nDiv);
        return radius;
    });

    var TimeLapseLayer = function (name) {
        // ***** Private members *****
        // Drawing bounds.
        var _w = 0;
        var _h = 0;
        var _bounds = {
            north: null,
            south: null,
            east: null,
            west: null
        };
        var _lonFactor = 1.0;
        var _latFactor = 1.0;

        // Canvas references.
        var _canvas = document.createElement('canvas');
        var _context = _canvas.getContext('2d');

        // Image buffer.
        var _imageLen = 32;
        var _imageBuf = new ArrayBuffer(_imageLen);
        var _imageBuf8 = new Uint8ClampedArray(_imageBuf);
        var _imageView = new Uint32Array(_imageBuf);
        var _imageData = null; // The data for the image that will be drawn.

        // Styling parameters.
        var _iDiv = 0;
        var _alpha = new Uint8Array(_nDiv + 1);
        _alpha[0] = 0x000000;
        _alpha[_nDiv] = 0xffffff;
        makeLinearRamp(_alpha, 0, _nDiv);

        // Transient drawing parameters.
        var _x, _y, _z, _center, _rgba;
        var _curSize = [0,0], _curExtent = [0,0,0,0];
        var _timeMillis = 0, _windowMillis = 0;

        // Binary stores holding observations.
        var _stores = [];

        // Function called by OL3 to update canvas.
        var _drawFn  = function (extent, // image extent (empirical investigation suggests
                                         // that this is 1.5 times the map extent)
                                 resolution,
                                 pixelRatio,
                                 size, // image size (empirical investigation suggests
                                       // that this is 1.5 times the map size)
                                 projection) {

            if (sizeChanged(_curSize, size) || extentChanged(_curExtent, extent)) {
                // Update size parameters.
                _w = _curSize[0] | 0;
                _h = _curSize[1] | 0;
                _canvas.setAttribute('width', _w);
                _canvas.setAttribute('height', _h);

                // Change image buffer size
                _imageLen = _w * _h * 4; // 4-bytes per pixel (RGBA)
                _imageBuf = new ArrayBuffer(_imageLen);
                _imageBuf8 = new Uint8ClampedArray(_imageBuf);
                _imageView = new Uint32Array(_imageBuf);
                _imageData = _context.createImageData(_w, _h);

                // Update extent parameters.
                _bounds.west  = _curExtent[0];
                _bounds.south = _curExtent[1];
                _bounds.east  = _curExtent[2];
                _bounds.north = _curExtent[3];

                _lonFactor = _w / (_bounds.east - _bounds.west);
                _latFactor = _h / (_bounds.north - _bounds.south);

                // Fill new image buffer now to prevent flicker effect.
                _.each(_stores, function (store) {
                    // TODO: Check if store set to be visible.
                    _fillImageBuffer(store);
                });
            }

            // Update the canvas context with the image buffer data.
            if (_imageData) {
                _imageData.data.set(_imageBuf8);
                _context.putImageData(_imageData, 0, 0);
            }

            return _canvas;
        };

        function _fillImageBuffer (store) {
            var color = store.getFillColorRgbArray();
            var timeLower = _timeMillis - _windowMillis;
            var timeUpper = _timeMillis;
            var iLower = store.getLowerBoundIdx(timeLower);
            var iUpper = store.getUpperBoundIdx(timeUpper);

            var nDivIdx = ((iUpper - iLower) / _nDiv) | 0;
            var radius = _radiusRamps[store.getPointRadius() - 1];

            var south = _bounds.south;
            var north = _bounds.north;
            var west = _bounds.west;
            var east = _bounds.east;

            for (var i = iLower; i < iUpper; i++) {
                var lat = store.getLat(i);
                var lon = store.getLon(i);
                if (lat > south && lat < north && lon > west && lon < east) {
                    _x = ((lon - west)  * _lonFactor) | 0;
                    _y = ((north - lat) * _latFactor) | 0;
                    _center = _y*_w + _x;

                    _iDiv = ((i - iLower) / nDivIdx) | 0;
                    _rgba =
                        (_alpha[_iDiv] << 24) | // alpha
                        (color[2]     << 16) | // blue
                        (color[1]     <<  8) | // green
                         color[0];            // red
                }

                // Fill circle at center with radius.
                fillCircle(_imageView, _imageLen, _w, _center, radius[_iDiv], _rgba);
            }
        }

        var _olSource = new ol.source.ImageCanvas({
            canvasFunction: _drawFn,
            projection: CONFIG.map.projection
        });

        var _olLayer = new ol.layer.Image({
            source: _olSource
        });

        // ***** Public methods *****
        this.getStores = function () {
            return _stores;
        };

        this.addStore = function (store, index) {
            if (angular.isNumber(index)) {
                _stores.splice(index, 0, store);
            } else {
                _stores.push(store);
            }

            if (_stores.length > 0) {
                $rootScope.$emit('timelapse:setDtgBounds', getBounds(_stores));
            }
        };

        this.removeStore = function (store) {
            _.pull(_stores, store);
            if (_stores.length > 0) {
                $rootScope.$emit('timelapse:setDtgBounds', getBounds(_stores));
            } else {
                $rootScope.$emit('timelapse:resetDtgBounds');
            }
        };

        this.redraw = function (timeMillis, windowMillis) {
            _timeMillis = timeMillis;
            _windowMillis = windowMillis;

            // Clear image buffer.
            clear(_imageView);

            // Fill image buffer with data from each store in the list.
            _.each(_stores, function (store) {
                // TODO: Check if store is set to be visible.
                _fillImageBuffer(store);
            });

            // Tell the OL3 ImageCanvas to invalidate the current cached canvas (i.e., redraw).
            _olSource.changed();
        };

        $log.debug(tag + 'new TimeLapseLayer(' + name + ')');
        MapLayer.apply(this, [name, _olLayer]);
        // TODO: Set viewer layer style directive.
        // TODO: Define viewer layer style directive below.
        // TODO: this.styleDirective = 'st-viewer-layer-style';
    };
    TimeLapseLayer.prototype = Object.create(MapLayer.prototype);

    // Static helper functions
    function clear (z) {
        var zn = z.length | 0;
        var i = 0 | 0;
        for ( ; (i | 0) < (zn | 0); i = (i+1 | 0)) {
            z[i] = 0;
        }
    }

    function fillCircle (buffer, bufLen, w, center, radius, value) {
        var x2 = 0, y2 = 0, r2 = radius * radius;
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

    function makeLinearRamp (x, i, j) {
        var k = (j-i) >> 1;
        if (k<1) {
            return;
        }
        x[i+k] = x[i] + ((x[j] - x[i]) >> 1); // Protect against overflow

        makeLinearRamp(x, i, i+k);
        makeLinearRamp(x, i+k, j);
    }

    function hasChanged (p, n) {
        var changed = false;

        if (p[0] < n[0] || p[0] > n[0] ||
            p[1] < n[1] || p[1] > n[1])
        {
            p[0] = n[0];
            p[1] = n[1];
            if (n.length > 2) {
                p[2] = n[2];
                p[3] = n[3];
            }
            changed = true;
        }

        return changed;
    }

    function sizeChanged(prevSize, newSize) {
        return hasChanged(prevSize, newSize);
    }

    function extentChanged(prevExtent, newExtent) {
        return hasChanged(prevExtent, newExtent);
    }

    function getBounds(stores) {
        // TODO: Check if store set to be visible.
        var minStore = _.min(stores, function (store) {
            return store.getMinTimeInMillis();
        });
        var minInSecs = minStore.getMinTimeInMillis() / 1000;

        var maxStore = _.max(stores, function (store) {
            return store.getMaxTimeInMillis();
        });
        var maxInSecs = maxStore.getMaxTimeInMillis() / 1000;

        return {
            minInSecs: minInSecs,
            maxInSecs: maxInSecs
        };
    }

    return TimeLapseLayer;
}])

.directive('stTimeLapseLayerStyle', [
'$log',
function ($log) {
    $log.debug('stealth.timelapse.geo.ol3.layers.stTimeLapseLayerStyle: directive defined');
    return {
        // TODO: Define style for viewer layer.
        template: '<div></div>'
    };
}])

;
