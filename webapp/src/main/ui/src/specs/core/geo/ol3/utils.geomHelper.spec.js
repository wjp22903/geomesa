describe('Service', function () {
    describe('"stealth.core.geo.ol3.utils.geomHelper"', function () {
        beforeEach(module('stealth.core.geo.ol3.utils'));

        var geomHelper;
        beforeEach(inject([
            'stealth.core.geo.ol3.utils.geomHelper',
            function (_geomHelper_) {
                geomHelper = _geomHelper_;
            }
        ]));

        it('should flip 2-dimensional points', function () {
            var geom = new ol.geom.Point([0, 1]);
            geomHelper.flipXY(geom);
            expect(geom.getCoordinates()).to.eql([1, 0]);
        });

        it('should flip 2-dimensional lines', function () {
            var geom = new ol.geom.LineString([[0, 1], [20, 30], [13, 14]]);
            geomHelper.flipXY(geom);
            expect(geom.getCoordinates()).to.eql([[1, 0], [30, 20], [14, 13]]);
        });

        it('should flip 2-dimensional polygons', function () {
            var geom = new ol.geom.Polygon([[[0, 1], [20, 30], [13, 14]]]);
            geomHelper.flipXY(geom);
            expect(geom.getCoordinates()).to.eql([[[1, 0], [30, 20], [14, 13]]]);
        });

        it('should flip 2-dimensional multi-points', function () {
            var geom = new ol.geom.MultiPoint([[0, 1], [101, 100]]);
            geomHelper.flipXY(geom);
            expect(geom.getCoordinates()).to.eql([[1, 0], [100, 101]]);
        });

        it('should flip 2-dimensional multi-lines', function () {
            var geom = new ol.geom.MultiLineString([[[0, 1], [20, 30], [13, 14]], [[101, 100], [102, 104]]]);
            geomHelper.flipXY(geom);
            expect(geom.getCoordinates()).to.eql([[[1, 0], [30, 20], [14, 13]], [[100, 101], [104, 102]]]);
        });

        it('should flip 2-dimensional multi-polys', function () {
            var geom = new ol.geom.MultiPolygon([[[[0, 1], [20, 30], [13, 14]]], [[[110, 111], [201, 310], [113, 141]]]]);
            geomHelper.flipXY(geom);
            expect(geom.getCoordinates()).to.eql([[[[1, 0], [30, 20], [14, 13]]], [[[111, 110], [310, 201], [141, 113]]]]);
        });

        it('should flip 3-dimensional points', function () {
            var geom = new ol.geom.Point([0, 1, 2]);
            geomHelper.flipXY(geom);
            expect(geom.getCoordinates()).to.eql([1, 0, 2]);
        });
    });
});
