describe('Factory', function () {
    describe('"stealth.core.utils.WidgetDef"', function () {
        beforeEach(module('stealth.core.utils'));

        var $rootScope,
            WidgetDef,
            testWidget,
            testScope;

        var directiveName = 'st-test-widget';
        var isoScopeAttrs = "view = 'testView'";

        beforeEach(inject([
            '$rootScope',
            'stealth.core.utils.WidgetDef',
            function (_$rootScope_, _WidgetDef_) {
                $rootScope = _$rootScope_;
                WidgetDef = _WidgetDef_;
                testScope = $rootScope.$new();
                testWidget = new WidgetDef(directiveName, testScope, isoScopeAttrs);
            }
        ]));

        it('should have a directive name', function () {
            expect(testWidget.getDirective()).to.equal(directiveName);
        });

        it('should have a parent scope', function () {
            expect(testWidget.getScope()).to.equal(testScope);
        });

        it('should have scope isolate attributes', function () {
            expect(testWidget.getIsoScopeAttrs()).to.equal(isoScopeAttrs);
        });
    });
})

;
