describe('Service', function () {
    describe('"stealth.core.geo.ows.owsLayers"', function () {
        beforeEach(module(
            function ($provide) {
                $provide.constant('CONFIG', STEALTH.config); // Provides CONFIG from testConfig.js.
            }
        ));
        beforeEach(module('stealth.core.utils'));
        beforeEach(module('stealth.core.geo.ows'));

        //Create mock impl for wms
        var serverLayers = [{
            Name: 'Good',
            KeywordList: [
                'test.good'
            ]
        }, {
            Name: 'Bad',
            KeywordList: [
                'test.bad=invalid', //this value will be wiped out by subsequent keywords
                                    //don't do this when config'ing a real layer
                'test.bad.reason.guess=evil',
                'test.bad.reason.real=wants attention'
            ]
        }];
        beforeEach(module(
            function ($provide) {
                $provide.service('wms', ['$q', function ($q) {
                    var _layers = null;
                    this.getCapabilities = function (url, omitProxy, forceRefresh, omitWms) {
                        if (forceRefresh) {
                            _layers = null;
                        }
                        if (_.isNull(_layers)) {
                            _layers = _.cloneDeep(serverLayers);
                        }
                        return $q.when({
                            Capability: {
                                Layer: {
                                    Layer: _layers
                                }
                            }
                        });
                    };
                }]);
            }
        ));

        var $rootScope;
        var owsLayers;
        beforeEach(inject([
            '$rootScope',
            'owsLayers',
            function (_$rootScope_, _owsLayers_) {
                $rootScope = _$rootScope_;
                owsLayers = _owsLayers_;
            }
        ]));


        //Tests
        it('should list layers', function () {
            var result;
            owsLayers.getLayers().then(function (layers) {
                result = layers;
            });
            $rootScope.$digest();
            expect(result).to.be.an('array');
            expect(result.length).to.equal(serverLayers.length);
        });

        it('should search layers', function () {
            var result;
            owsLayers.getLayers('bad').then(function (layers) {
                result = layers;
            });
            $rootScope.$digest();
            console.log(result[0].KeywordConfig.bad);
            expect(result).to.be.an('array');
            expect(result.length).to.equal(1);
        });

        it('should report layer configs', function () {
            var result;
            owsLayers.getLayers(['bad', 'reason', 'real']).then(function (layers) {
                result = layers;
            });
            $rootScope.$digest();
            expect(result).to.be.an('array');
            expect(result.length).to.equal(1);
            expect(result[0].KeywordConfig.bad).to.be.an('object');
            expect(result[0].KeywordConfig.bad.reason.real).to.equal('wants attention');
        });

        //This test alters the layer list and does not clean up after itself.
        it('should allow forced refresh', function () {
            //List layers
            owsLayers.getLayers('good').then(function (layers) {
                result = layers;
            });
            $rootScope.$digest();
            expect(result.length).to.equal(1);

            //Simulate server update
            serverLayers.push({
                Name: 'Really Good',
                KeywordList: [
                    'test.good.really=true'
                ]
            });

            //List layers again, without refresh.  Should be the same.
            owsLayers.getLayers('good').then(function (layers) {
                result = layers;
            });
            $rootScope.$digest();
            expect(result.length).to.equal(1);

            //Force refresh and see update
            owsLayers.getLayers('good', true).then(function (layers) {
                result = layers;
            });
            $rootScope.$digest();
            expect(result.length).to.equal(2);
        });
    });
})
;
