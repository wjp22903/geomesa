angular.module('stealth.mediator.air-timelapse', [
    'stealth.air.geo.ol3.layers',
    'stealth.timelapse.geo.ol3.layers'
])

.config([
'$provide',
function ($provide) {
    //Completely replace stealth.timelapse.geo.ol3.layers.LiveWmsLayer with alternate impl
    $provide.decorator('stealth.timelapse.geo.ol3.layers.LiveWmsLayer', [
        '$delegate',
        'stealth.air.geo.ol3.layers.LiveWmsLayerConstructorFactory',
        function (LiveWmsLayer, LiveWmsLayerConstructorFactory) {
            return LiveWmsLayerConstructorFactory.getConstructor(LiveWmsLayer);
        }
    ]);

    //Completely replace stealth.timelapse.stores.QueryBinStore with alternate impl
    $provide.decorator('stealth.timelapse.geo.ol3.layers.TimeLapseLayer', [
        '$delegate',
        'stealth.air.geo.ol3.layers.TimeLapseLayerConstructorFactory',
        function (TimeLapseLayer, TimeLapseLayerConstructorFactory) {
            return TimeLapseLayerConstructorFactory.getConstructor(TimeLapseLayer);
        }
    ]);

    //Completely replace stealth.timelapse.stores.QueryBinStore with alternate impl
    $provide.decorator('stealth.timelapse.stores.QueryBinStore', [
        '$delegate',
        'stealth.air.stores.QueryBinStoreConstructorFactory',
        function (QueryBinStore, QueryBinStoreConstructorFactory) {
            return QueryBinStoreConstructorFactory.getConstructor(QueryBinStore);
        }
    ]);
}])

.run([
'owsLayers',
function (owsLayers) {
    owsLayers.keywordExtender.addKeywordExtender(function (keywordConfig) {
        //Apply all air.live config to timelapse.live
        var airLive = _.get(keywordConfig, 'air.live');
        if (airLive) {
            _.set(keywordConfig, 'timelapse.live',
                _.merge(_.get(keywordConfig, 'timelapse.live', {}),
                    airLive));
        }

        //Apply all air.historical config to timelapse.historical
        var airHist = _.get(keywordConfig, 'air.historical');
        if (airHist) {
            _.set(keywordConfig, 'timelapse.historical',
                _.merge(_.get(keywordConfig, 'timelapse.historical', {}),
                    airHist));
        }

        return keywordConfig;
    });
}])
;
