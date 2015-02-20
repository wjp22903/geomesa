describe('Factory', function () {
    describe('"stealth.timelapse.stores.BinStore"', function () {
        beforeEach(module(
            function ($provide) {
                $provide.constant('CONFIG', STEALTH.config); // Provides CONFIG from testConfig.js.
            }
        ));
        beforeEach(module('stealth.core.utils'));
        beforeEach(module('stealth.timelapse.stores'));

        var id16 = 16;
        var id24 = 24;
        var thisMoment = moment();
        var nowInSecs = thisMoment.format("x") / 1000 | 0;
        var lat = 37.7749300;
        var lon = -122.4194200;

        var BinStore;
        var NUM_RECORDS = 10000;
        var store16;
        var store24;
        var stride16 = 4;
        var stride24 = 6;

        beforeEach(inject([
            'stealth.timelapse.stores.BinStore',
            function (BinStore) {
                var i = 0, z = 0;
                var buf16 = new ArrayBuffer(16 * NUM_RECORDS);
                var idView16 = new Uint32Array(buf16, 0);
                var secondsView16 = new Uint32Array(buf16, 4);
                var latView16 = new Float32Array(buf16, 8);
                var lonView16 = new Float32Array(buf16, 12);
                for (i=0; i<NUM_RECORDS; i++) {
                    z = i * stride16;
                    idView16[z] = id16 + i;
                    secondsView16[z] = nowInSecs + i;
                    latView16[z] = lat;
                    lonView16[z] = lon;
                }
                store16 = new BinStore('Store for 16-byte records');
                store16.setArrayBuffer(buf16);

                var buf24 = new ArrayBuffer(24 * NUM_RECORDS);
                var idView24 = new Uint32Array(buf24, 0);
                var secondsView24 = new Uint32Array(buf24, 4);
                var latView24 = new Float32Array(buf24, 8);
                var lonView24 = new Float32Array(buf24, 12);
                for (i=0; i<NUM_RECORDS; i++) {
                    z = i * stride24;
                    idView24[z] = id24 + i;
                    secondsView24[z] = nowInSecs + i;
                    latView24[z] = lat;
                    lonView24[z] = lon;
                }
                store24 = new BinStore('Store for 24-byte records');
                store24.setArrayBuffer(buf24);

            }
        ]));

        it('should have an valid id', function () {
            var i = 2;
            expect(store16.getId(i * stride16)).to.equal(id16 + i);
            expect(store24.getId(i * stride24)).to.equal(id24 + i);
        });

        it('should give access to time stamps', function () {
            var i = 10;
            expect(store16.getTimeInSeconds(i * stride16)).to.equal(nowInSecs + i);
            expect(store24.getTimeInSeconds(i * stride24)).to.equal(nowInSecs + i);
        });

        it('should know min time stamp', function () {
            expect(store16.getMinTimeInMillis()).to.equal(nowInSecs * 1000);
            expect(store24.getMinTimeInMillis()).to.equal(nowInSecs * 1000);
        });

        it('should know max time stamp', function () {
            expect(store16.getMaxTimeInMillis()).to.equal((nowInSecs + NUM_RECORDS-1) * 1000);
            expect(store24.getMaxTimeInMillis()).to.equal((nowInSecs + NUM_RECORDS-1) * 1000);
        });

        it('should give access to latitudes', function () {
            var i = 123;
            expect(store16.getLat(i * stride16)*10000 | 0).to.equal(lat*10000 | 0);
            expect(store24.getLat(i * stride24)*10000 | 0).to.equal(lat*10000 | 0);
        });

        it('should give access to longitudes', function () {
            var i = 1000;
            expect(store16.getLon(i * stride16)*10000 | 0).to.equal(lon*10000 | 0);
            expect(store24.getLon(i * stride24)*10000 | 0).to.equal(lon*10000 | 0);
        });

        it('should give access to the stride', function () {
            expect(store16.getStride()).to.equal(stride16);
            expect(store24.getStride()).to.equal(stride24);
        });

        it('should calculate min time bounds', function () {
            var i = 0;
            // Check a time before beginning of buffer:
            expect(store16.getLowerBoundIdx((nowInSecs - 3600) * 1000)).to.equal(i - 1);
            expect(store24.getLowerBoundIdx((nowInSecs - 3600) * 1000)).to.equal(i - 1);

            // Check time at beginning of buffer:
            expect(store16.getLowerBoundIdx(nowInSecs * 1000)).to.equal(i - 1);
            expect(store24.getLowerBoundIdx(nowInSecs * 1000)).to.equal(i - 1);

            // Check time at 2nd index:
            i = 1;
            expect(store16.getLowerBoundIdx((nowInSecs + i) * 1000)).to.equal(i - 1);
            expect(store24.getLowerBoundIdx((nowInSecs + i) * 1000)).to.equal(i - 1);

            // Check times in the middle:
            i = NUM_RECORDS/2;
            expect(store16.getLowerBoundIdx((nowInSecs + i) * 1000)).to.equal(i - 1);
            expect(store24.getLowerBoundIdx((nowInSecs + i) * 1000)).to.equal(i - 1);
            i = NUM_RECORDS/2 - 154;
            expect(store16.getLowerBoundIdx((nowInSecs + i) * 1000)).to.equal(i - 1);
            expect(store24.getLowerBoundIdx((nowInSecs + i) * 1000)).to.equal(i - 1);

            // Check time at end of buffer:
            i = NUM_RECORDS - 1;
            expect(store16.getLowerBoundIdx((nowInSecs + i) * 1000)).to.equal(i - 1);
            expect(store24.getLowerBoundIdx((nowInSecs + i) * 1000)).to.equal(i - 1);

            // Check a time after end of buffer:
            expect(store16.getLowerBoundIdx((nowInSecs + i + 3600) * 1000)).to.equal(i);
            expect(store24.getLowerBoundIdx((nowInSecs + i + 3600) * 1000)).to.equal(i);
        });

        it('should calculate max time bounds', function () {
            var i = 0;
            // Check a time before beginning of buffer:
            expect(store16.getUpperBoundIdx((nowInSecs - 3600) * 1000)).to.equal(i);
            expect(store24.getUpperBoundIdx((nowInSecs - 3600) * 1000)).to.equal(i);

            // Check time at beginning of buffer:
            expect(store16.getUpperBoundIdx(nowInSecs * 1000)).to.equal(i + 1);
            expect(store24.getUpperBoundIdx(nowInSecs * 1000)).to.equal(i + 1);

            // Check time at 2nd index:
            i = 1;
            expect(store16.getUpperBoundIdx((nowInSecs + i) * 1000)).to.equal(i + 1);
            expect(store24.getUpperBoundIdx((nowInSecs + i) * 1000)).to.equal(i + 1);

            // Check times in the middle:
            i = NUM_RECORDS/2;
            expect(store16.getUpperBoundIdx((nowInSecs + i) * 1000)).to.equal(i + 1);
            expect(store24.getUpperBoundIdx((nowInSecs + i) * 1000)).to.equal(i + 1);
            i = NUM_RECORDS/2 - 154;
            expect(store16.getUpperBoundIdx((nowInSecs + i) * 1000)).to.equal(i + 1);
            expect(store24.getUpperBoundIdx((nowInSecs + i) * 1000)).to.equal(i + 1);

            // Check time at end of buffer:
            i = NUM_RECORDS - 1;
            expect(store16.getUpperBoundIdx((nowInSecs + i) * 1000)).to.equal(i + 1);
            expect(store24.getUpperBoundIdx((nowInSecs + i) * 1000)).to.equal(i + 1);

            // Check a time after end of buffer:
            expect(store16.getUpperBoundIdx((nowInSecs + i + 3600) * 1000)).to.equal(i + 1);
            expect(store24.getUpperBoundIdx((nowInSecs + i + 3600) * 1000)).to.equal(i + 1);
         });

        it('should know the number of records', function () {
            expect(store16.getNumRecords()).to.equal(NUM_RECORDS);
            expect(store24.getNumRecords()).to.equal(NUM_RECORDS);
        });
    });
})
;
