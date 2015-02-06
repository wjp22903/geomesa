angular.module('stealth.timelapse.stores')

.factory('stealth.timelapse.stores.BinStore', [
'$log',
'$q',
'colors',
function ($log, $q, colors) {
    var tag = 'stealth.timelapse.stores.BinStore: ';
    $log.debug(tag + 'factory started');

    var BinStore = function (name, fillColorHexString, pointRadius, colorBy, arrayBuffer) {
        var _layerThisBelongsTo;

        var _fillColorRgbArray = [0, 0, 0];
        var _fillColorHexString = '#000000';
        var _setFillColorHexString = function (hexString) {
            _fillColorHexString = hexString;
            _fillColorRgbArray = colors.hexStringToRgbArray(hexString);
            if (!_.isUndefined(_layerThisBelongsTo)) {
                _layerThisBelongsTo.redraw();
            }
        };
        var _pointRadius = 2;
        var _setPointRadius = function (radius) {
            if (radius > 100) {
                radius = 100;
            }
            _pointRadius = radius;
            if (!_.isUndefined(_layerThisBelongsTo)) {
                _layerThisBelongsTo.redraw();
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
                _layerThisBelongsTo.redraw();
            }
        };
        this.getViewState = function () { return _viewState; };
        // Getters for values of the i-th record.
        this.getId = function (i) { return _idView[i * _stride]; };
        this.getTimeInSeconds = function (i) { return _secondsView[i * _stride]; };
        this.getLat = function (i) { return _latView[i * _stride]; };
        this.getLon = function (i) { return _lonView[i * _stride]; };
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
            _layerThisBelongsTo.redraw();
        };

        // Setter for ArrayBuffer and dependent vars.
        this.setArrayBuffer = function (buf) {
            _arrayBuffer = buf;
            _idView = new Uint32Array(_arrayBuffer, 0);
            _secondsView = new Uint32Array(_arrayBuffer, 4);
            _latView = new Float32Array(_arrayBuffer, 8);
            _lonView = new Float32Array(_arrayBuffer, 12);
            _recordSizeBytes = _determineRecordSize(_latView, _lonView);
            _stride = _recordSizeBytes / 4;
            _lastRecordIndex = _secondsView.length - (_stride - 1);
            _minTimeMillis = _secondsView[0] * 1000;
            _maxTimeMillis = _secondsView[_lastRecordIndex] * 1000;
            _numRecords = _arrayBuffer.byteLength / _recordSizeBytes;
        };

        if (!_.isUndefined(arrayBuffer)) {
            this.setArrayBuffer(arrayBuffer);
        }

        this.destroy = function () {
            _arrayBuffer = undefined;
            _idView = undefined;
            _secondsView = undefined;
            _latView = undefined;
            _lonView = undefined;
            _recordSizeBytes = undefined;
            _stride = undefined;
            _lastRecordIndex = undefined;
            _minTimeMillis = undefined;
            _maxTimeMillis = undefined;
            _numRecords = undefined;
        };

        this.searchPointAndTime = function (coord, res, timeMillis, windowMillis) {
            var result = {
                name: _name,
                isError: false,
                layerFill: {
                    color: _fillColorHexString
                },
                records: [],
                fieldTypes: [
                    { name: 'lat', localType: 'number' },
                    { name: 'lon', localType: 'number' },
                    { name: 'dtg', localType: 'date-time' },
                    { name: 'id', localType: 'string' }
                ]
            };
            var modifier = res * Math.max(_pointRadius, 4);
            var minLat = Math.max((coord[1] - modifier), -90);
            var maxLat = Math.min((coord[1] + modifier), 90);
            var minLon = Math.max((coord[0] - modifier), -180);
            var maxLon = Math.min((coord[0] + modifier), 180);

            for (var i = 0; i < _numRecords; i++) {
                var lat = _latView[i * _stride];
                var lon = _lonView[i * _stride];
                var millis = _secondsView[i * _stride] * 1000;
                if (lat >= minLat && lat <= maxLat &&
                    lon >= minLon && lon <= maxLon &&
                    millis <= timeMillis && millis >= (timeMillis - windowMillis))
                {
                    result.records.push({
                        lat: lat,
                        lon: lon,
                        dtg: millis,
                        id: _idView[i * _stride]
                    });
                }
            }
            return $q.when(result);
        };
    };

    function _determineRecordSize(latView, lonView) {
        var MAX_POINTS = 100;
        var STRIDE = 4;
        var NERRORS_THRESHOLD = 1;
        var errorCount = 0;

        var bytesPerRecord = 16;

        for (var i=0; i<MAX_POINTS; i++) {
            var z = i * STRIDE;
            if (latView[z] > 90) {errorCount++;}
            if (latView[z] < -90) {errorCount++;}
            if (lonView[z] > 360) {errorCount++;}
            if (lonView[z] < -360) {errorCount++;}
            if (errorCount >= NERRORS_THRESHOLD) {
                bytesPerRecord = 24 | 0;
                break;
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
            middleTimeSecs = this.getTimeInSeconds(middle);
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
            middleTimeSecs = this.getTimeInSeconds(middle);
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
