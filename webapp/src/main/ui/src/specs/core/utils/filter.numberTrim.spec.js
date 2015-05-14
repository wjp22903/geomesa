describe('Filter', function () {
    describe('"stealth.core.utils.numberTrim"', function () {
        beforeEach(module('stealth.core.utils'));

        var numberTrim;
        beforeEach(inject([
            '$filter',
            function ($filter) {
                numberTrim = $filter('numberTrim');
            }
        ]));

        it('should trim decimal places', function () {
            var result;
            result = numberTrim(1.111111, 3);
            expect(result).to.equal('1.111');
            result = numberTrim(2.55555, 4);
            expect(result).to.equal('2.5556');
            result = numberTrim(3.010000, 3);
            expect(result).to.equal('3.01');
            result = numberTrim(4.0000, 2);
            expect(result).to.equal('4');
        });

        it('should add commas', function () {
            var result;
            result = numberTrim(1234, 0);
            expect(result).to.equal('1,234');
            result = numberTrim(5000000.60789, 3);
            expect(result).to.equal('5,000,000.608');
        });

        it('should not trim trailing zeroes from ints', function () {
            var result;
            result = numberTrim(100);
            expect(result).to.equal('100');
            result = numberTrim(2000.100, 0);
            expect(result).to.equal('2,000');
        });
    });
})
;
