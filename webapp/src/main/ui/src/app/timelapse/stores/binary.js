angular.module('stealth.timelapse.stores', [
    'stealth.core.geo.ows'
])

.factory('stealth.timelapse.stores.BinStore', [
'$log',
'$rootScope',
'colors',
'wfs',
'CONFIG',
function ($log, $rootScope, colors, wfs, CONFIG) {
    var tag = 'stealth.timelapse.stores.BinStore: ';
    $log.debug(tag + 'factory started');

    var BinStore = function (name, fillColorHexString, pointRadius, colorBy, arrayBuffer) {
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

        var _categoryViewState = {
            toggledOn: true,
            isDataPending: function () {
                return _.isUndefined(_arrayBuffer);
            },
            isDataReady: function () {
                return !_.isUndefined(_arrayBuffer);
            },
            isError: false,
            errorMsg: ''
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
        this.getCategoryViewState = function () { return _categoryViewState; };
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

        //TODO: Add streaming query capability
        var _thisStore = this;
        this.launchQuery = function (query) {
            var url = query.serverData.currentGeoserverUrl + '/' +
                      query.layerData.currentLayer.prefix;
            var typeName = query.layerData.currentLayer.name;
            var responseType = 'arraybuffer';
            var storeName = query.params.storeName;
            var geom = query.params.geomField.name;
            var dtg = query.params.dtgField.name;
            var id = query.params.idField.name;
            var overrides = {
                sortBy: dtg,
                propertyName: dtg + ',' + geom + ',' + id,
                outputFormat: 'application/vnd.binary-viewer',
                format_options: 'dtg:' + dtg + ';trackId:' + id,
                cql_filter: buildCQLFilter(query)
            };

            wfs.getFeature(url, typeName, CONFIG.geoserver.omitProxy, overrides, responseType)
            .success(function (data, status, headers, config, statusText) {
                var contentType = headers('content-type');
                if (contentType.indexOf('xml') > -1) {
                    $log.error(tag + '(' + _name + ') ows:ExceptionReport returned');
                    $log.error(data);
                    _categoryViewState.isError = true;
                    _categoryViewState.errorMsg = 'ows:ExceptionReport returned';
                } else {
                    // 'data' expected to be of type ArrayBuffer.
                    if (data.byteLength === 0) {
                        $log.error(tag + '(' + _name + ') No results');
                        _categoryViewState.isError = true;
                        _categoryViewState.errorMsg = 'No results';
                    } else {
                        _thisStore.setArrayBuffer(data);
                        $rootScope.$emit('timelapse:querySuccessful');
                    }
                }
            })
            .error(function(data, status, headers, config, statusText) {
                var msg = 'HTTP status ' + status + ': ' + statusText;
                $log.error(tag + '(' + _name + ') ' + msg);
                _categoryViewState.isError = true;
                _categoryViewState.errorMsg = msg;
            });
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

    function buildCQLFilter(query) {
        var cql_filter =
            'BBOX(' + query.params.geomField.name + ',' +
            query.params.minLat + ',' + query.params.minLon + ',' +
            query.params.maxLat + ',' + query.params.maxLon + ')' +
            ' AND ' + query.params.dtgField.name + ' DURING ' +
            moment(query.params.startDate).format('YYYY-MM-DD') + 'T' +
            moment(query.params.startTime).format('HH:mm') + ':00.000Z' +
            '/' +
            moment(query.params.endDate).format('YYYY-MM-DD') + 'T' +
            moment(query.params.endTime).format('HH:mm') + ':00.000Z ';
        if (query.params.cql) {
            cql_filter += ' AND ' + query.params.cql;
        }
        return cql_filter;
    }

    return BinStore;
}])
;
