angular.module('stealth.timelapse.stores')

.factory('stealth.timelapse.stores.BinStore', [
'$log',
'colors',
function ($log, colors) {
    var tag = 'stealth.timelapse.stores.BinStore: ';
    $log.debug(tag + 'factory started');

    var BinStore = function (arrayBuffer, name, fillColorHexString, pointRadius, colorBy) {
        var _fillColorRgbArray = [0, 0, 0];
        var _fillColorHexString = '#000000';
        var _setFillColorHexString = function (hexString) {
            _fillColorHexString = hexString;
            _fillColorRgbArray = colors.hexStringToRgbArray(hexString);
        };
        var _pointRadius = 2;
        var _setPointRadius = function (radius) {
            if (radius > 100) {
                radius = 100;
            }
            _pointRadius = radius;
        };

        var _name = name || 'unknown';
        _setFillColorHexString(fillColorHexString || colors.getColor());
        _setPointRadius(pointRadius || 2);
        var _colorBy = colorBy;
        var _arrayBuffer = arrayBuffer;
        var _idView = new Uint32Array(_arrayBuffer, 0);
        var _secondsView = new Uint32Array(_arrayBuffer, 4);
        var _latView = new Float32Array(_arrayBuffer, 8);
        var _lonView = new Float32Array(_arrayBuffer, 12);
        var _recordSizeBytes = _determineRecordSize(_latView, _lonView);
        var _stride = _recordSizeBytes / 4;
        var _lastRecordIndex = _secondsView.length - (_stride - 1);
        var _minTimeMillis = _secondsView[0] * 1000;
        var _maxTimeMillis = _secondsView[_lastRecordIndex] * 1000;
        var _numRecords = _arrayBuffer.byteLength / _recordSizeBytes;

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
            return 0;
        }

        if (this.getMaxTimeInMillis() <= timeMillis) {
            return (len - 1);
        }

        while (len > 1) {
            half = len >> 1;
            middle = first + half;
            middleTimeSecs = this.getTimeInSeconds(middle);
            if ((timeSeconds - middleTimeSecs) === 0) {
              return middle;
            } else if (middleTimeSecs < timeSeconds) {
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
            first = 0,
            middleTimeSecs;

        if (this.getMinTimeInMillis() >= timeMillis) {
            return 0;
        }

        if (this.getMaxTimeInMillis() <= timeMillis) {
            return (len - 1);
        }

        while (len > 1) {
            half = len >> 1;
            middle = first + half;
            middleTimeSecs = this.getTimeInSeconds(middle);
            if ((timeSeconds - middleTimeSecs) === 0) {
                return middle;
            } else if (timeSeconds < middleTimeSecs) {
                len = half;
            } else {
                first = middle;
                len = len - half;
            }
        }
        return first;
    };

    return BinStore;
}])
;
