angular.module('stealth.core.geo.query.proximity')

.service('proximityService', [
'wps',
'user',
'CONFIG',
function (wps, user, CONFIG) {
    function buildProxLayerName (dataLayer) {
        var timestamp = moment().utc().format('YYMMDDHHmmss');
        return 'prox_' + timestamp + '_' + user.getStrippedCn();
    }

    //arg contains inputGeoJson, dataLayer, dataLayerFilter, bufferMeters
    this.doGeoJsonProximity = function (arg) {
        var storeName = CONFIG.app.context + '.user.' + user.getStrippedCn();
        var resultLayer = buildProxLayerName(arg.dataLayer);
        var templateFn = stealth.jst['wps/proximity_geojson.xml'];
        var req = templateFn({
            inputFeatures: arg.inputGeoJson,
            dataLayer: arg.dataLayer,
            dataLayerFilter: arg.dataLayerFilter,
            bufferMeters: arg.bufferMeters,
            output: {
                workspace: storeName,
                store: storeName,
                name: resultLayer,
                keywords: [
                    CONFIG.app.context + '.output.proximity'
                ].join()
            }
        });
        return wps.submit(CONFIG.geoserver.defaultUrl, req, CONFIG.geoserver.omitProxy);
    };
}])
;
