angular.module('stealth.common.store.binaryDataStore', [])

.factory('DataStore', function() {
    /*
     * Expects an ArrayBuffer with the following format:
     * id (4 bytes), time (4 bytes), lat (4 bytes), lon (4 bytes), [reach back (8 bytes)]
     * All of the constructed views will be built from the proper starting offset so only the
     * stride will be needed to access elements.
     */
    function DataStore (arrayBuffer) {
        this.arrayBuffer = arrayBuffer;
        this.idView = new Uint32Array(arrayBuffer, 0);
        this.timeView = new Uint32Array(arrayBuffer, 4);
        this.latView = new Float32Array(arrayBuffer, 8);
        this.lonView = new Float32Array(arrayBuffer, 12);
        this.recordSizeBytes = determineRecordSize(this.latView, this.lonView);
        this.stride = this.recordSizeBytes / 4;
        this.lastRecordIndex = this.timeView.length - (this.stride - 1);
        this.minTimestamp = this.timeView[0] * 1000;
        this.maxTimestamp = this.timeView[this.lastRecordIndex] * 1000;
        this.numRecords = arrayBuffer.byteLength / this.recordSizeBytes;
    }

    function determineRecordSize(latView, lonView) {
        var MAX_POINTS = 100;
        var NSKIP = 4;
        var NERRORS_THRESHOLD = 4;
        var errorCount = 0;

        var bytesPerRecord = 16;

        for (var z = 0; z < MAX_POINTS; z += NSKIP) {
            if (latView[z] > 90) {errorCount++;}
            if (latView[z] < -90) {errorCount++;}
            if (lonView[z] > 360) {errorCount++;}
            if (lonView[z] < -360) {errorCount++;}
            if (errorCount > NERRORS_THRESHOLD) {
                bytesPerRecord = 24 | 0;
                break;
            }
        }
        console.debug('(DataStore) Data format is ' + bytesPerRecord + ' bytes/record');
        return bytesPerRecord;
    }

    //TODO: Move this over to an asm module.
    DataStore.prototype.lowerBound = function (timestamp) {

        var timeSeconds = timestamp / 1000,
            len = this.numRecords,
            half = 0,
            middle = 0,
            first = 0;

        if (this.minTimestamp >= timestamp) {
            return 0;
        }

        while (len > 0) {
            half = len >> 1;
            middle = first + half * this.stride;
            if (this.timeView[middle] < timeSeconds) {
                first = middle + this.stride;
                len = len - half - 1;
            } else {
                len = half;
            }
        }
        return first;
    };

    //TODO: Move this over to an asm module.
    DataStore.prototype.upperBound = function (timestamp) {

        var timeSeconds = timestamp / 1000,
            len = this.numRecords,
            half = 0,
            middle = 0,
            first = 0;

        if (this.maxTimestamp <= timestamp) {
            return this.lastRecordIndex;
        }

        while (len > 0) {
            half = len >> 1;
            middle = first + half * this.stride;
            if (this.timeView[middle] > timeSeconds) {
                len = half;
            } else {
                first = middle + this.stride;
                len = len - half - 1;
            }
        }
        return first;
    };

    function createStore (arrayBuffer) {
        return new DataStore(arrayBuffer);
    }

    return {
        createStore: createStore
    };
});
