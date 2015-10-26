describe('Service', function () {
    describe('"stealth.core.geo.ol3.utils.trackDrawHelper"', function () {
        beforeEach(module('stealth.targetpri.wizard.track'));

        var trackDrawHelper,
            pdFeatures = [],
            coords = [[-157.909, 21.334], [-157.481, 21.125], [-156.316, 20.664], [-155.053, 19.928], [-155.064, 19.686]],
            interpolationError = null;
        beforeEach(inject([
            'stealth.core.geo.ol3.utils.trackDrawHelper',
            function (_trackDrawHelper_) {
                trackDrawHelper = _trackDrawHelper_;
                _.each(coords, function (coord, index) {
                    pdFeatures.push(new ol.Feature({
                        id: _.now() + '_' + index,
                        dtgIsInterpolated: false,
                        dtg: '',
                        geometry: new ol.geom.Point(coord)
                    }));
                });
            }
        ]));

        afterEach(function () {
            pdFeatures = [];
            interpolationError = null;
        });

        it('should fail because two dates are the same (position 1)', function () {
            var now = moment.utc();
            pdFeatures[0].set('dtg', now);
            pdFeatures[1].set('dtg', now);
            interpolationError = trackDrawHelper.interpolateTimes(pdFeatures, coords);
            expect(interpolationError).to.equal('Duplicate time at point #2');
        });

        it('should fail because two dates are the same (position 2)', function () {
            var now = moment.utc();
            pdFeatures[0].set('dtg', now);
            pdFeatures[3].set('dtg', now);
            interpolationError = trackDrawHelper.interpolateTimes(pdFeatures, coords);
            expect(interpolationError).to.equal('Duplicate time at point #4');
        });

        it('should fail because two dates are the same (position 3)', function () {
            var now = moment.utc();
            pdFeatures[2].set('dtg', now);
            pdFeatures[4].set('dtg', now);
            interpolationError = trackDrawHelper.interpolateTimes(pdFeatures, coords);
            expect(interpolationError).to.equal('Duplicate time at point #5');
        });

        it('should fail because there are fewer than two dates', function () {
            var now = moment.utc();
            pdFeatures[1].set('dtg', now);
            interpolationError = trackDrawHelper.interpolateTimes(pdFeatures, coords);
            expect(interpolationError).to.equal('Track must contain at least 2 non-estimated times.');
        });

        it('should fail because the dates are not in order (position 1)', function () {
            var now = moment.utc();
            pdFeatures[0].set('dtg', now.clone().add(1, 'm'));
            pdFeatures[1].set('dtg', now);
            interpolationError = trackDrawHelper.interpolateTimes(pdFeatures, coords);
            expect(interpolationError).to.equal('Out of order time at point #2');
        });

        it('should fail because the dates are not in order (position 2)', function () {
            var now = moment.utc();
            pdFeatures[0].set('dtg', now.clone().add(1, 'm'));
            pdFeatures[2].set('dtg', now);
            interpolationError = trackDrawHelper.interpolateTimes(pdFeatures, coords);
            expect(interpolationError).to.equal('Out of order time at point #3');
        });

        it('should fail because the dates are not in order (position 3)', function () {
            var now = moment.utc();
            pdFeatures[0].set('dtg', now);
            pdFeatures[1].set('dtg', now.clone().add(1, 'm'));
            pdFeatures[2].set('dtg', now.clone().add(2, 'm'));
            pdFeatures[3].set('dtg', now.clone().add(1, 'm'));
            pdFeatures[4].set('dtg', now.clone().add(3, 'm'));
            interpolationError = trackDrawHelper.interpolateTimes(pdFeatures, coords);
            expect(interpolationError).to.equal('Out of order time at point #4');
        });

        it('should fail because the dates are not moments', function () {
            var now = moment.utc();
            pdFeatures[1].set('dtg', now);
            _.each(pdFeatures, function (feature, index) {
                feature.set('dtg', 'Mon Aug 17 2015 08:0' + index + ':00 GMT-0400 (EDT)');
            });
            interpolationError = trackDrawHelper.interpolateTimes(pdFeatures, coords);
            expect(interpolationError).to.equal('Track must contain at least 2 non-estimated times.');
        });

        it('should make no changes because all dates have been set by the user', function () {
            var now = moment.utc();
            _.each(pdFeatures, function (feature, index) {
                feature.set('dtg', now.clone().add(index, 'm'));
            });
            interpolationError = trackDrawHelper.interpolateTimes(pdFeatures, coords);
            _.each(pdFeatures, function (feature) {
                expect(feature.get('dtgIsInterpolated')).to.equal(false);
            });
            expect(interpolationError).to.equal(null);
        });

        it('should interpolate dates in the future', function () {
            // set first two dates
            pdFeatures[0].set('dtg', moment('2013-12-31T19:53:00.000Z'));
            pdFeatures[1].set('dtg', moment('2013-12-31T19:57:08.000Z'));
            interpolationError = trackDrawHelper.interpolateTimes(pdFeatures, coords);
            expect(interpolationError).to.equal(null);
            expect(pdFeatures[2].get('dtg').toISOString()).to.equal('2013-12-31T20:07:59.079Z');
            expect(pdFeatures[4].get('dtg').toISOString()).to.equal('2013-12-31T20:22:59.422Z');
        });

        it('should interpolate dates in the future (non-adjacent)', function () {
            // set two non-adjacent dates
            pdFeatures[0].set('dtg', moment('2013-12-31T19:53:00.000Z'));
            pdFeatures[2].set('dtg', moment('2013-12-31T19:57:08.000Z'));
            interpolationError = trackDrawHelper.interpolateTimes(pdFeatures, coords);
            expect(interpolationError).to.equal(null);
            expect(pdFeatures[1].get('dtg').toISOString()).to.equal('2013-12-31T19:54:08.407Z');
            expect(pdFeatures[4].get('dtg').toISOString()).to.equal('2013-12-31T20:01:16.348Z');
        });

        it('should interpolate dates in the past', function () {
            // set two dates in the middle
            pdFeatures[2].set('dtg', moment('2013-12-31T20:08:00.000Z'));
            pdFeatures[3].set('dtg', moment('2013-12-31T20:18:00.000Z'));
            interpolationError = trackDrawHelper.interpolateTimes(pdFeatures, coords);
            expect(interpolationError).to.equal(null);
            expect(pdFeatures[0].get('dtg').toISOString()).to.equal('2013-12-31T19:56:17.225Z');
            expect(pdFeatures[1].get('dtg').toISOString()).to.equal('2013-12-31T19:59:31.077Z');
            expect(pdFeatures[4].get('dtg').toISOString()).to.equal('2013-12-31T20:19:43.762Z');
        });

        it('should interpolate dates in the past (non-adjacent)', function () {
            // set two non-adjacent dates
            pdFeatures[2].set('dtg', moment('2013-12-31T20:08:00.000Z'));
            pdFeatures[4].set('dtg', moment('2013-12-31T20:18:00.000Z'));
            interpolationError = trackDrawHelper.interpolateTimes(pdFeatures, coords);
            expect(interpolationError).to.equal(null);
            expect(pdFeatures[0].get('dtg').toISOString()).to.equal('2013-12-31T19:58:00.841Z');
            expect(pdFeatures[1].get('dtg').toISOString()).to.equal('2013-12-31T20:00:46.112Z');
            expect(pdFeatures[3].get('dtg').toISOString()).to.equal('2013-12-31T20:16:31.536Z');
        });
    });
})
;
