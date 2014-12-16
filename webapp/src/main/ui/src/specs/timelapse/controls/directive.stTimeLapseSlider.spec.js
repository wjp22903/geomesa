describe('Directive', function () {
    describe('"stealth.timelapse.controls.stTimeLapseSlider"', function () {
        beforeEach(module('stealth.core.utils'));
        beforeEach(module('stealth.timelapse.controls'));

        var el = null;
        var inputEl = null;
        var $rootScope = null;
        var scope = null;
        var isoScope = null;
        var testModel = {
            value: 10,
            min: 0,
            max: 120,
            unit: 'm'
        };
        testModel.millis = testModel.value * 60000; // convert from minutes
        testModel.toMillis = function (val, unit) {
            switch (unit) {
                case 's':
                    return (val * 1000);
                case 'm':
                    return (val * 60000);
                case 'h':
                    return (val * 3600000);
                case 'd':
                    return (val * 86400000);
                default:
                    return val;
            }
        };

        beforeEach(inject([
            '$rootScope',
            '$compile',
            '$templateCache',
            function (_$rootScope_, $compile, $templateCache) {
                $rootScope = _$rootScope_;
                scope = $rootScope.$new();
                scope.testModel = testModel;
                var str = '<st-time-lapse-slider \
                              model="testModel" \
                              emit="timelapse:testModelChanged"> \
                           </st-time-lapse-slider>';
                el = angular.element(str);
                el = $compile(el)(scope);
                scope.$digest();
                inputEl = el.find('input');
                isoScope = el.isolateScope();
            }
        ]));

        it('', function () {
            console.log(el);
            console.log(inputEl);
        });

        it('should have an isolated scope', function () {
            expect(isoScope).to.be.defined;
            expect(isoScope.$id).not.to.equal(scope.$id);
        });

        it('should have access to model values', function () {
            expect(isoScope.model.value).to.equal(10);
            expect(isoScope.model.min).to.equal(0);
            expect(isoScope.model.max).to.equal(120);
            expect(isoScope.model.unit).to.equal('m');
            expect(isoScope.model.millis).to.equal(600000);
        });

        it('should be an range input with float parser', function () {
            expect(inputEl.attr('type')).to.equal('range');
            expect(inputEl.attr('st-float-slider')).to.equal('');
        });

        describe('when slider value is changed', function () {
            beforeEach(function () {
                isoScope.model.value = 20;
                isoScope.model.changed();
            });

            it('should recalculate slider value in milliseconds', function () {
                expect(isoScope.model.millis).to.equal(isoScope.model.value * 60000);
            });
        });

        describe('when slider max value is changed', function () {
            beforeEach(function () {
                isoScope.model.max = 240;
                isoScope.model.changed();
            });

            it('should recalculate slider value', function () {
                expect(isoScope.model.value).to.equal(40);
                expect(isoScope.model.millis).to.equal(40 * 60000);
            });
        });

        describe('when slider unit is changed', function () {
            beforeEach(function () {
                isoScope.model.unit = 's';
                isoScope.model.changed();
            });

            it('should recalculate slider value', function () {
                expect(isoScope.model.value).to.equal(40);
                expect(isoScope.model.millis).to.equal(40 * 1000);
            });
        });

        var spy = null;
        describe('when a change occurs', function () {
            beforeEach(function () {
                spy = sinon.spy($rootScope, '$emit');
                isoScope.model.changed();
            });

            it('should emit an event', function () {
                spy.should.have.been.called;
                spy.should.have.been.calledWith('timelapse:testModelChanged', isoScope.model.millis);
            });
        });
    });
})

;