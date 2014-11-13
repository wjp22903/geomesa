describe('AppController', function () {
    var scope, loadTime;

    beforeEach(function () {
        module('stealth.app', function ($provide) {
            $provide.value('CONFIG', {});
        });
        loadTime = moment();
        inject(function ($controller, $rootScope) {
            scope = $rootScope.$new();
            $controller('AppController', {$scope: scope});
        });
    });

    it('should know load time', function () {
        expect(
            loadTime.isSame(
                moment(scope.app.loadTime, 'YYYYMMDDHHmmss'),
                'minute'
            )
        ).to.be.ok;
    });
});
