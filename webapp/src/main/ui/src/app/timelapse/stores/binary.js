angular.module('stealth.timelapse.stores', [
    'stealth.core.utils'
])

.factory('stealth.timelapse.stores.BinStore', [
'$log',
'$q',
'$filter',
'toastr',
'colors',
'clickSearchHelper',
function ($log, $q, $filter, toastr, colors, clickSearchHelper) {
    var tag = 'stealth.timelapse.stores.BinStore: ';
    $log.debug(tag + 'factory started');

    var BinStore = function (name, fillColorHexString, pointRadius, colorBy, arrayBuffer, alreadySorted) {
        var _layerThisBelongsTo;

        var _fillColorRgbArray = [0, 0, 0];
        var _fillColorHexString = '#000000';
        var _setFillColorHexString = function (hexString) {
            _fillColorHexString = hexString;
            _fillColorRgbArray = colors.hexStringToRgbArray(hexString);
            if (!_.isUndefined(_layerThisBelongsTo)) {
                _layerThisBelongsTo.redrawCurrent();
            }
        };
        var _pointRadius = 2;
        var _setPointRadius = function (radius) {
            if (radius > 100) {
                radius = 100;
            }
            _pointRadius = radius;
            if (!_.isUndefined(_layerThisBelongsTo)) {
                _layerThisBelongsTo.redrawCurrent();
            }
        };

        var _name = name || 'unknown';
        _setFillColorHexString(fillColorHexString || colors.getColor());
        _setPointRadius(pointRadius || 2);
        var _colorBy = colorBy;
        var _opacity = 100;

        var _arrayBuffer;
        var _idView;
        var _secondsView;
        var _latView;
        var _lonView;
        var _label1View;
        var _label2View;
        var _recordSizeBytes;
        var _stride;
        var _lastRecordIndex;
        var _minTimeMillis;
        var _maxTimeMillis;
        var _numRecords;

        var _viewState = {
            toggledOn: true,
            isDataPending: function () {
                return _.isUndefined(_arrayBuffer);
            },
            isDataReady: function () {
                return !_.isUndefined(_arrayBuffer);
            },
            isError: false,
            errorMsg: '',
            size: _pointRadius,
            fillColor: _fillColorHexString,
            opacity: _opacity,
            colorById: false
        };

        // Getters and setters for display properties
        this.getName = function () { return _name; };
        this.setName = function (name) { _name = name; };
        this.getFillColorRgbArray = function () { return _fillColorRgbArray; };
        this.getFillColorHexString = function () { return _fillColorHexString; };
        this.setFillColorHexString = _setFillColorHexString;
        this.getPointRadius = function () { return _pointRadius; };
        this.setPointRadius = _setPointRadius;
        this.getColorBy = function () { return _colorBy; };
        this.setColorBy = function (colorBy) { _colorBy = colorBy; };
        this.getOpacity = function () { return _opacity; };
        this.setOpacity = function (opacity) {
            _opacity = opacity | 0;
            if (!_.isUndefined(_layerThisBelongsTo)) {
                _layerThisBelongsTo.redrawCurrent();
            }
        };
        this.getViewState = function () { return _viewState; };
        // Getters for values of the i-th record.
        this.getId = function (iStride) { return _idView[iStride]; };
        this.getTimeInSeconds = function (iStride) { return _secondsView[iStride]; };
        this.getLat = function (iStride) { return _latView[iStride]; };
        this.getLon = function (iStride) { return _lonView[iStride]; };
        this.getLabel = function (iStride) {
            if (this.hasLabel()) {
                return new dcodeIO.Long(_label1View[iStride], _label2View[iStride]);
            }
            return null;
        };
        this.getLabelString = function (iStride) {
            var label = this.getLabel(iStride);
            return label ? label.toString() : null;
        };
        this.hasLabel = function () {
            return this.getStride() === 6;
        };
        // Getters for constants.
        this.getArrayBuffer = function () { return _arrayBuffer; };
        this.getStride = function () { return _stride; };
        this.getMinTimeInMillis = function () { return _minTimeMillis; };
        this.getMaxTimeInMillis = function () { return _maxTimeMillis; };
        this.getNumRecords = function () { return _numRecords; };

        this.setLayerBelongsTo = function (layer) { _layerThisBelongsTo = layer;};

        this.toggleVisibility = function () {
            _viewState.toggledOn = !_viewState.toggledOn;
            _layerThisBelongsTo.setDtgBounds();
        };
        this.toggleColorById = function () {
            _viewState.colorById = !_viewState.colorById;
            _layerThisBelongsTo.redrawCurrent();
        };

        // Setter for ArrayBuffer and dependent vars.
        this.setArrayBuffer = function (buf, sorted, callback) {
            if (buf.byteLength % 4 === 0) {
                _idView = new Uint32Array(buf, 0);
                _secondsView = new Uint32Array(buf, 4);
                _latView = new Float32Array(buf, 8);
                _lonView = new Float32Array(buf, 12);
                _label1View = new Uint32Array(buf, 16);
                _label2View = new Uint32Array(buf, 20);
                _recordSizeBytes = _determineRecordSize(_latView, _lonView);
                if (_recordSizeBytes) {
                    _stride = _recordSizeBytes / 4;
                    _lastRecordIndex = _secondsView.length - (_stride - 1);
                    _numRecords = buf.byteLength / _recordSizeBytes;
                    var finish = function () {
                        _arrayBuffer = buf;
                        _minTimeMillis = _secondsView[0] * 1000;
                        _maxTimeMillis = _secondsView[_lastRecordIndex] * 1000;
                        if (_.isFunction(callback)) {
                            callback();
                        }
                        var numString = $filter('number')(_numRecords, 0);
                        toastr.info(numString + ' results', this.getName());
                        $log.info(this.getName() + ': ' + numString + ' results');
                    };
                    if (!sorted) {
                        var vi32 = new Int32Array(buf);
                        var vf64 = new Float64Array(buf);
                        var si32 = new Int32Array(64);
                        si32[0] = 0;
                        si32[1] = _numRecords;
                        sortBinRec(vi32, vf64, si32, 2, 1, _stride/2, _.bind(finish, this));
                    } else {
                        finish.call(this);
                    }
                    return;
                }
            }
            this.destroy();
            $log.error('Invalid binary data format');
            _viewState.isError = true;
            _viewState.errorMsg = 'Invalid data format';
            toastr.error(_viewState.errorMsg, 'Error: ' + this.getName());
        };

        if (!_.isUndefined(arrayBuffer)) {
            this.setArrayBuffer(arrayBuffer, alreadySorted);
        }

        this.destroy = function () {
            _arrayBuffer = undefined;
            _idView = undefined;
            _secondsView = undefined;
            _latView = undefined;
            _lonView = undefined;
            _label1View = undefined;
            _label2View = undefined;
            _recordSizeBytes = undefined;
            _stride = undefined;
            _lastRecordIndex = undefined;
            _minTimeMillis = undefined;
            _maxTimeMillis = undefined;
            _numRecords = undefined;
        };

        this.searchPointAndTimeForRecords = function (coord, res, startMillis, endMillis) {
            var features = [];
            var trimmedFeatures;
            var overrides = {
                fixedPixelBuffer: Math.max(_pointRadius, 4)
            };
            var extent = clickSearchHelper.getSearchExtent(coord, res, overrides);

            for (var i = 0; i < _numRecords; i++) {
                var lat = _latView[i * _stride];
                var lon = _lonView[i * _stride];
                var millis = _secondsView[i * _stride] * 1000;
                if (ol.extent.containsXY(extent, lon, lat) &&
                    millis <= endMillis && millis >= startMillis)
                {
                    features.push(new ol.Feature({
                        geometry: new ol.geom.Point([lon, lat]),
                        lat: lat,
                        lon: lon,
                        dtg: millis,
                        id: _idView[i * _stride],
                        label: this.getLabelString(i * _stride)
                    }));
                }
            }
            trimmedFeatures = clickSearchHelper.sortAndTrimFeatures(coord, features);
            return _.map(trimmedFeatures, function (feat) {
                return _.omit(feat.getProperties(), 'geometry');
            });
        };
        this.searchPointAndTime = function (coord, res, startMillis, endMillis) {
            return $q.when({
                name: _name,
                isError: false,
                layerFill: {
                    color: _fillColorHexString
                },
                records: this.searchPointAndTimeForRecords(coord, res, startMillis, endMillis),
                fieldTypes: [
                    { name: 'lat', localType: 'number' },
                    { name: 'lon', localType: 'number' },
                    { name: 'dtg', localType: 'date-time' },
                    { name: 'id', localType: 'string' },
                    { name: 'label', localType: 'string'}
                ]
            });
        };
    };

    function _determineRecordSize(latView, lonView) {
        var MAX_POINTS = 100;
        var NERRORS_THRESHOLD = 1;

        var bytesPerRecord = 16;

        var tooManyErrors = function (testBytesPerRecord) {
            var errorCount = 0;
            for (var i=0; i<MAX_POINTS; i++) {
                var z = i * (testBytesPerRecord / 4);
                if (latView[z] > 90) {errorCount++;}
                if (latView[z] < -90) {errorCount++;}
                if (lonView[z] > 360) {errorCount++;}
                if (lonView[z] < -360) {errorCount++;}
                if (errorCount >= NERRORS_THRESHOLD) {
                    return true;
                }
            }
            return false;
        };

        if (tooManyErrors(bytesPerRecord)) {
            bytesPerRecord = 24;
            if (tooManyErrors(bytesPerRecord)) {
                $log.error('Unable to determine bin file record size');
                return null;
            }
        }
        $log.debug(tag + 'Format is ' + bytesPerRecord + ' bytes/record');
        return bytesPerRecord;
    }

    BinStore.prototype.getLowerBoundIdx = function (timeMillis) {
        var timeSeconds = timeMillis / 1000,
            len = this.getNumRecords(),
            half = 0,
            middle = 0,
            first = 0,
            middleTimeSecs;

        if (this.getMinTimeInMillis() >= timeMillis) {
            return -1;
        }

        if (this.getMaxTimeInMillis() < timeMillis) {
            return (len - 1);
        }

        while (len > 1) {
            half = len >> 1;
            middle = first + half;
            middleTimeSecs = this.getTimeInSeconds(middle * this.getStride());
            if (middleTimeSecs < timeSeconds) {
                first = middle;
                len = len - half;
            } else {
                len = half;
            }
        }
        return first;
    };

    BinStore.prototype.getUpperBoundIdx = function (timeMillis) {
        var timeSeconds = timeMillis / 1000,
            len = this.getNumRecords(),
            half = 0,
            middle = 0,
            first = this.getNumRecords(),
            middleTimeSecs;

        if (this.getMinTimeInMillis() > timeMillis) {
            return 0;
        }

        if (this.getMaxTimeInMillis() <= timeMillis) {
            return (len);
        }

        while (len > 1) {
            half = len >> 1;
            middle = first - half;
            middleTimeSecs = this.getTimeInSeconds(middle * this.getStride());
            if (timeSeconds < middleTimeSecs) {
                first = middle;
                len = len - half;
            } else {
                len = half;
            }
        }
        return first;
    };

    return BinStore;
}])
;
