describe('AirTrackInfo factory tests:', function () {
    console.log('Testing AirTrackInfo factory.');
    var control;

    // Executed before each "it()" is run.
    beforeEach(function () {
        // Load the info control module.
        module('stealth.common.control.airTrackInfoControl');
        // Provide a mock CONFIG.
        module(function ($provide) {
            $provide.constant('CONFIG', {});
        });

        // Inject the factory for testing.
        inject(function(CONFIG, AirTrackInfo) {
            control = AirTrackInfo.createControl();
        });
    });

    // Testing at the application level.
    it('Should have an onAdd() function', function () {
        expect(angular.isFunction(control.onAdd)).to.be.ok;
    });

    it('onAdd() should return an HTMLElement', function () {
        var elem = control.onAdd(null);
        expect(elem).to.be.an.instanceOf(HTMLElement);
    });

    it('Should have an update() function', function () {
        expect(angular.isFunction(control.update)).to.be.ok;
    });

    it('update() should not have a return value', function () {
        control.onAdd(null);
        var rtnVal = control.update();
        expect(rtnVal).to.be.undefined;
    });
});
