describe('Factory', function () {
    describe('"stealth.core.geo.ol3.format.GeoJson"', function () {
        beforeEach(module('stealth.core.geo.ol3.format'));

        var geoJsonFormat;

        beforeEach(inject([
            'stealth.core.geo.ol3.format.GeoJson',
            function (GeoJson) {
                geoJsonFormat = new GeoJson();
            }
        ]));

        it('should leave existing non-null attributes of a feature alone', function () {
            var pt = new ol.Feature({
                geometry: new ol.geom.Point([0, 0]),
                x: 1,
                y: '2'
            });
            var geoJson = geoJsonFormat.writeFeatureObject(pt);
            expect(geoJson.properties).to.be.an('object');
            expect(geoJson.properties.x).to.equal(1);
            expect(geoJson.properties.y).to.equal('2');
            expect(geoJson.properties).to.have.all.keys(['x', 'y']);
        });

        it('should have an empty object of properties for a feature with no attributes', function () {
            var pt = new ol.Feature({
                geometry: new ol.geom.Point([0, 0])
            });
            var geoJson = geoJsonFormat.writeFeatureObject(pt);
            expect(geoJson.properties).to.be.an('object');
            expect(geoJson.properties).to.be.empty;
        });

        it('should give feature collections a crs object', function () {
            var pt = new ol.Feature({
                geometry: new ol.geom.Point([0, 0])
            });
            var geoJson = geoJsonFormat.writeFeaturesObject([pt]);
            expect(geoJson).to.be.an('object');
            expect(geoJson).to.have.any.keys(['crs']);
        });
    });
})
;
