describe('Service', function () {
    describe('"stealth.core.geo.ol3.geodetics.ol3Geodetics"', function () {
        beforeEach(module('stealth.core.geo.ol3.geodetics'));

        var ol3Geodetics;
        beforeEach(inject([
            'ol3Geodetics',
            function (_ol3Geodetics_) {
                ol3Geodetics = _ol3Geodetics_;
            }
        ]));

        it('should calculate Vincenty distance', function () {
            var distance;
            distance = ol3Geodetics.distanceVincenty();
            expect(distance).to.equal(0);
            distance = ol3Geodetics.distanceVincenty([[0, 0]]);
            expect(distance).to.equal(0);
            distance = ol3Geodetics.distanceVincenty([[0, 0], [1, 1]]);
            expect(distance).to.be.closeTo(156899.57, 0.1);
            distance = ol3Geodetics.distanceVincenty([[0, 0], [1, 1], [-1, 2]]);
            expect(distance).to.be.closeTo(405415.1, 0.1);
        });

        it('should calculate Haversine distance', function () {
            var distance;
            distance = ol3Geodetics.distanceHaversine();
            expect(distance).to.equal(0);
            distance = ol3Geodetics.distanceHaversine([[0, 0]]);
            expect(distance).to.equal(0);
            distance = ol3Geodetics.distanceHaversine([[0, 0], [1, 1]]);
            expect(distance).to.be.closeTo(157249.6, 0.1);
            distance = ol3Geodetics.distanceHaversine([[0, 0], [1, 1], [-1, 2]]);
            expect(distance).to.be.closeTo(405818.67, 0.1);
        });
    });
})
;
