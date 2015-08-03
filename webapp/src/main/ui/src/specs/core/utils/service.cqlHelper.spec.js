describe('Service', function () {
    describe('"stealth.core.utils.cqlHelper"', function () {
        beforeEach(module('stealth.core.utils'));

        var cqlHelper;
        beforeEach(inject([
            'cqlHelper',
            function (_cqlHelper_) {
                cqlHelper = _cqlHelper_;
            }
        ]));

        it('should combine clauses', function () {
            var result;
            result = cqlHelper.combine(cqlHelper.operator.AND, '1', '2', ' 3', '4 ', ' 5 ');
            expect(result).to.equal('(1) AND (2) AND (3) AND (4) AND (5)');
            result = cqlHelper.combine(cqlHelper.operator.OR, ' any thing ', ' something else ');
            expect(result).to.equal('(any thing) OR (something else)');
        });

        it('should handle combining empty clauses', function () {
            var result;
            result = cqlHelper.combine(cqlHelper.operator.AND);
            expect(result).to.equal('INCLUDE');
            result = cqlHelper.combine(cqlHelper.operator.AND, ' ', null);
            expect(result).to.equal('INCLUDE');
            result = cqlHelper.combine(cqlHelper.operator.AND, '1', 2);
            expect(result).to.equal('1');
            result = cqlHelper.combine(cqlHelper.operator.OR, ' ', ' 2 ');
            expect(result).to.equal('2');
            result = cqlHelper.combine(cqlHelper.operator.OR, null, '1 ', undefined, ' ', false, 5, '2');
            expect(result).to.equal('(1) OR (2)');
        });

        it('should filter out lone INCLUDE clauses', function () {
            var result;
            result = cqlHelper.combine(cqlHelper.operator.OR, '1', ' INCLUDE ', '2', '(include) ');
            expect(result).to.equal('(1) OR (2)');
            result = cqlHelper.combine(cqlHelper.operator.AND, '() include ', '1', '4', '( INCLUDE ', '5');
            expect(result).to.equal('(1) AND (4) AND (5)');
            result = cqlHelper.combine(cqlHelper.operator.OR, '6', '7 AND INCLUDE');
            expect(result).to.equal('(6) OR (7 AND INCLUDE)');
        });

        it('should build dtg filters from dates', function () {
            var start = '2000-01-01T00:00:00.000Z';
            var end = '2001-12-31T23:59:59.999Z';
            var startDtg = moment(start);
            var endDtg = moment(end);
            var result;
            result = cqlHelper.buildDtgFilter('mydtg', startDtg, endDtg);
            expect(result).to.equal('mydtg DURING ' + start + '/' + end);
            result = cqlHelper.buildDtgFilter('mydtg', endDtg, startDtg);
            expect(result).to.equal('mydtg DURING ' + start + '/' + end);
            result = cqlHelper.buildDtgFilter('mydtg', startDtg);
            expect(result).to.equal('mydtg AFTER ' + start);
            result = cqlHelper.buildDtgFilter('mydtg', null, endDtg);
            expect(result).to.equal('mydtg BEFORE ' + end);
        });

        it('should build dtg filters from strings', function () {
            var start = '2000-01-01T00:00:00.000Z';
            var end = '2001-12-31T23:59:59.999Z';
            var startDtg = moment(start);
            var endDtg = moment(end);
            var result;
            result = cqlHelper.buildDtgFilter('mydtg', startDtg, endDtg, true);
            expect(result).to.equal("mydtg >= '" + start + "' AND mydtg <= '" + end + "'");
            result = cqlHelper.buildDtgFilter('mydtg', endDtg, startDtg, true);
            expect(result).to.equal("mydtg >= '" + start + "' AND mydtg <= '" + end + "'");
            result = cqlHelper.buildDtgFilter('mydtg', startDtg, null, true);
            expect(result).to.equal("mydtg >= '" + start + "'");
            result = cqlHelper.buildDtgFilter('mydtg', null, endDtg, true);
            expect(result).to.equal("mydtg <= '" + end + "'");
        });

        it('should build dtg filters from strings with alternate formatting', function () {
            var start = '2000-01-01T00:00:00.000Z';
            var end = '2001-12-31T23:59:59.999Z';
            var startFormatted = "20000101000000";
            var endFormatted = "20011231235959";
            var formatter = function (dtg) {
                return moment(dtg).utc().format("YYYYMMDDHHmmss");
            };
            var startDtg = moment(start);
            var endDtg = moment(end);
            var result;
            result = cqlHelper.buildDtgFilter('mydtg', startDtg, endDtg, true, formatter);
            expect(result).to.equal("mydtg >= '" + startFormatted + "' AND mydtg <= '" + endFormatted + "'");
            result = cqlHelper.buildDtgFilter('mydtg', endDtg, startDtg, true, formatter);
            expect(result).to.equal("mydtg >= '" + startFormatted + "' AND mydtg <= '" + endFormatted + "'");
            result = cqlHelper.buildDtgFilter('mydtg', startDtg, null, true, formatter);
            expect(result).to.equal("mydtg >= '" + startFormatted + "'");
            result = cqlHelper.buildDtgFilter('mydtg', null, endDtg, true, formatter);
            expect(result).to.equal("mydtg <= '" + endFormatted + "'");
        });

        it('should build dtg filters without invalid dtgs', function () {
            var start = '2000-01-01T00:00:00.000Z';
            var startDtg = moment(start);
            var end = '2000-02-01T00:00:00.000Z';
            var endDtg = moment(end);
            var invalidStart = '2000-01-00T00:00:00.000Z';
            var invalidStartDtg = moment(invalidStart);
            var invalidEnd = '2000-02-01T28:00:00.000Z';
            var invalidEndDtg = moment(invalidEnd);
            var result;
            result = cqlHelper.buildDtgFilter('mydtg', invalidStartDtg, endDtg, true);
            expect(result).to.equal("mydtg <= '" + end + "'");
            result = cqlHelper.buildDtgFilter('mydtg', startDtg, invalidEndDtg);
            expect(result).to.equal('mydtg AFTER ' + start);
            result = cqlHelper.buildDtgFilter('mydtg', invalidStartDtg, invalidEndDtg);
            expect(result).to.equal('INCLUDE');
        });

        it('should build bbox filters', function () {
            var result;
            result = cqlHelper.buildBboxFilter('mygeom', [1, 2, 3, 4]);
            expect(result).to.equal('BBOX(mygeom,1,2,3,4)');
        });
    });
})
;
