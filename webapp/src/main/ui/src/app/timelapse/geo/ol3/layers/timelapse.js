angular.module('stealth.timelapse.geo.ol3.layers', [
    'stealth.core.geo.ol3.layers',
    'stealth.core.utils'
])

.factory('stealth.timelapse.geo.ol3.layers.TimeLapseLayer', [
'$log',
'$rootScope',
'stealth.core.geo.ol3.layers.MapLayer',
'CONFIG',
'colors',
function ($log, $rootScope, MapLayer, CONFIG, colors) {
    var tag = 'stealth.timelapse.geo.ol3.layers.TimeLapseLayer: ';
    $log.debug(tag + 'factory started');

    var _nDiv = 10 | 0;  // Number of divisions for styling.
    var _radiusRamps = _.map(_.range(1, 101), function (max) {
        var radius = new Uint32Array(_nDiv);
        radius[0] = 1;
        radius[_nDiv - 1] = max;
        makeLinearRamp(radius, 0, _nDiv - 1);
        return radius;
    });
    var _r2Plus1Ramps = _.map(_radiusRamps, function (ramp) {
        return _.map(ramp, function (radius) {
            return (radius - 1) * (radius - 1) + 1;
        });
    });

    var _alphaRamps = _.map(_.range(1, 101), function (max) {
        var alpha = new Uint8Array(_nDiv);
        alpha[0] = 2;
        alpha[_nDiv - 1] = max / 100 * 0xff | 0;
        makeLinearRamp(alpha, 0, _nDiv - 1);
        return alpha;
    });

    var _numColors = colors.getNumColors();
    var _colorRgbArray = _.map(_.range(0, _numColors), function (i) {
        var hex = colors.getColor(i);
        return colors.hexStringToRgbArray(hex);
    });

    var TimeLapseLayer = function (name) {
        // ***** Private members *****
        // Drawing bounds.
        var _w = 0 | 0;
        var _h = 0 | 0;
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

        // Transient drawing parameters.
        var _iDiv = 0;
        var _x, _y, _idx, _center, _rgba;
        var _curSize = [0,0], _curExtent = [0,0,0,0];
        var _timeMillis = 0, _windowMillis = 0;
        var zn, x, y, y2, pixel, rPlus1, yw, lat, lon;
        var south, north, west, east;
        var color, timeLower, timeLowerSeconds, iLower, iUpper, stride, iUpperStride;
        var nDivIdx, radiusRamp, r2Plus1Ramp, alphaRamp, colorById, iCol, rMinus1;

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
                _curSize = angular.copy(size);
                _curExtent = angular.copy(extent);
                _w = _curSize[0] | 0;
                _h = _curSize[1] | 0;
                _canvas.setAttribute('width', _w);
                _canvas.setAttribute('height', _h);

                // Change image buffer size
                _imageLen = _w * _h * 4 | 0; // 4-bytes per pixel (RGBA)
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
                _.eachRight(_stores, function (store) {
                    if (store.getViewState().toggledOn) {
                        _fillImageBuffer(store);
                    }
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
            stride = store.getStride();
            color = store.getFillColorRgbArray();
            iLower = store.getLowerBoundIdx(timeLower);
            iUpper = store.getUpperBoundIdx(_timeMillis);

            rMinus1 = store.getPointRadius() - 1;
            radiusRamp = _radiusRamps[rMinus1];
            r2Plus1Ramp = _r2Plus1Ramps[rMinus1];
            alphaRamp = _alphaRamps[store.getOpacity() - 1];

            south = _bounds.south;
            north = _bounds.north;
            west = _bounds.west;
            east = _bounds.east;

            colorById = store.getViewState().colorById;
            _idx = (iLower + 1) * stride;
            iUpperStride = iUpper * stride;
            for (; _idx < iUpperStride; _idx = _idx + stride | 0) {
                if (colorById) {
                    iCol = store.getId(_idx) % _numColors;
                    color = _colorRgbArray[iCol];
                }
                lat = store.getLat(_idx);
                lon = store.getLon(_idx);
                _iDiv = (store.getTimeInSeconds(_idx) - timeLowerSeconds) / nDivIdx | 0;
                if ( lat > south &&
                     lat < north &&
                     lon > west &&
                     lon < east )
                {
                    _x = ((lon - west)  * _lonFactor) | 0;
                    _y = ((north - lat) * _latFactor) | 0;
                    _center = _y*_w + _x | 0;

                    _rgba = (alphaRamp[_iDiv] << 24) | // alpha
                            (color[2]     << 16) | // blue
                            (color[1]     <<  8) | // green
                             color[0];             // red

                    // Fill circle at center with radius.
                    _fillCircle(_imageView, _imageLen, _w, _center, radiusRamp[_iDiv], r2Plus1Ramp[_iDiv], _rgba);
                }
            }
        }

        function _clear (z) {
            zn = z.length | 0;
            while(zn--) {
                z[zn] = 0;
            }
        }

        function _fillCircle (buffer, bufLen, w, center, radius, r2Plus1, value) {
            buffer[center] = value;
            y = 1 | 0;
            for (; y < radius; y = (y + 1 | 0)) {
                y2 = y * y | 0;
                yw = y * w | 0;
                pixel = center + yw | 0;
                if (pixel < bufLen) {
                    buffer[pixel] = value;
                }
                pixel = center - yw | 0;
                if (pixel > -1) {
                    buffer[pixel] = value;
                }
                pixel = center + y | 0;
                if (pixel < bufLen) {
                    buffer[pixel] = value;
                }
                pixel = center - y | 0;
                if (pixel > -1) {
                    buffer[pixel] = value;
                }
                x = 1 | 0;
                for (; x < radius; x = (x + 1 | 0)) {
                    if (x * x + y2 < r2Plus1) {
                        pixel = center + yw + x | 0;
                        if (pixel < bufLen) {
                            buffer[pixel] = value;
                        }
                        pixel = center - yw + x | 0;
                        if (pixel > -1 && pixel < bufLen) {
                            buffer[pixel] = value;
                        }
                        pixel = center + yw - x | 0;
                        if (pixel > -1 && pixel < bufLen) {
                            buffer[pixel] = value;
                        }
                        pixel = center - yw - x | 0;
                        if (pixel > -1) {
                            buffer[pixel] = value;
                        }
                    }
                }
            }
        }

        var _olSource = new ol.source.ImageCanvas({
            ratio: 1,
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

        this.setDtgBounds = function () {
            $log.debug(tag + 'setDtgBounds()');

            var filtered = _.filter(_stores, function (store) {
                var cvs = store.getViewState();
                return (cvs.toggledOn && cvs.isDataReady());
            });

            if (!_.isEmpty(filtered)) {
                $rootScope.$emit('timelapse:setDtgBounds', getBounds(filtered));
                $log.debug(tag + 'emitted "timelapse:setDtgBounds" message');
            } else {
                $rootScope.$emit('timelapse:resetDtgBounds');
                $log.debug(tag + 'emitted "timelapse:resetDtgBounds" message');
            }
        };

        var _self = this;
        this.addStore = function (store, index) {
            store.setLayerBelongsTo(_self);
            if (angular.isNumber(index)) {
                _stores.splice(index, 0, store);
            } else {
                _stores.push(store);
            }
            this.setDtgBounds();
        };

        this.removeStore = function (store) {
            _.pull(_stores, store);
            this.setDtgBounds();
        };

        this.redrawCurrent = function () {
            this.redraw(_timeMillis, _windowMillis);
        };

        this.redraw = function (timeMillis, windowMillis) {
            _timeMillis = timeMillis;
            _windowMillis = windowMillis;
            timeLower = _timeMillis - _windowMillis;
            nDivIdx = (_windowMillis / _nDiv / 1000) + 1.5 | 0;
            timeLowerSeconds = ((timeLower - 500) / 1000) | 0;

            // Clear image buffer.
            _clear(_imageView);

            // Fill image buffer with data from each store in the list.
            _.eachRight(_stores, function (store) {
                if (store.getViewState().toggledOn && store.getOpacity() > 0) {
                    _fillImageBuffer(store);
                }
            });

            // Tell the OL3 ImageCanvas to invalidate the current cached canvas (i.e., redraw).
            _olSource.changed();
        };

        this.searchActiveStores = function (coord, res) {
            var activeStores = _.filter(_stores, function (store) {
                var viewState = store.getViewState();
                return viewState.toggledOn && !viewState.isError;
            });
            return _.map(activeStores, function (store) {
                return store.searchPointAndTime(coord, res, _timeMillis, _windowMillis);
            });
        };

        $log.debug(tag + 'new TimeLapseLayer(' + name + ')');
        MapLayer.apply(this, [name, _olLayer]);
        this.styleDirective = 'st-time-lapse-layer-style';
        this.styleDirectiveScope.styleVars.iconClass = 'fa fa-fw fa-lg fa-clock-o';
        this.styleDirectiveScope.layer = _self;
        this.styleDirectiveScopeAttrs += " layer='layer'";
        this.styleDirectiveScope.stores = _stores;
        this.styleDirectiveScopeAttrs += " stores='stores'";
        this.styleDirectiveScope.sizeChanged = function (store, size) {
            if (!angular.isNumber(size)) { // Prevents deleting number in input field.
                size = 1;
                store.getViewState().size = size;
            }
            store.setPointRadius(size);
        };
    };
    TimeLapseLayer.prototype = Object.create(MapLayer.prototype);

    // Static helper functions
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
        if (p[0] < n[0] || p[0] > n[0] ||
            p[1] < n[1] || p[1] > n[1])
        {
            return true;
        }

        return false;
    }

    function sizeChanged(prevSize, newSize) {
        return hasChanged(prevSize, newSize);
    }

    function extentChanged(prevExtent, newExtent) {
        return hasChanged(prevExtent, newExtent);
    }

    function getBounds(stores) {
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
        templateUrl: 'timelapse/geo/ol3/layers/timelapse.tpl.html'
    };
}])
;
