describe('Factory', function () {
    describe('"stealth.core.geo.ol3.layers.MapLayer"', function () {
        beforeEach(module('ui.bootstrap'));
        beforeEach(module('stealth.core.popup.capabilities'));
        beforeEach(module('stealth.core.geo.ol3.layers'));

        var MapLayer;
        var testLayer;

        beforeEach(inject([
            'stealth.core.geo.ol3.layers.MapLayer',
            function (_MapLayer_) {
                MapLayer = _MapLayer_;
                testLayer = new MapLayer('Test Layer', null);
            }
        ]));

        it('should have an id number', function () {
            expect(testLayer.getId()).to.be.a('number');
        });

        it('should have a style display widget definition', function () {
            expect(testLayer.getStyleDisplayDef()).to.exist;
        });

        it('should have a reference to a layer', function () {
            expect(testLayer.getOl3Layer()).to.be.a('null');
        });
    });
})
;
