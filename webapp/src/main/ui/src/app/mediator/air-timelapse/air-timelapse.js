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
}])

.run([
'owsLayers',
function (owsLayers) {
    owsLayers.keywordExtender.addKeywordExtender(function (keywordConfig) {
        //Apply all air.live config to timelapse.live
        var airLive = _.deepGet(keywordConfig, 'air.live');
        if (airLive) {
            _.deepSet(keywordConfig, 'timelapse.live',
                _.merge(_.deepGet(keywordConfig, 'timelapse.live') || {},
                    airLive));
        }

        return keywordConfig;
    });
}])
;
