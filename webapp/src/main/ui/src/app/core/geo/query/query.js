angular.module('stealth.core.geo.query')

.service('stealth.core.geo.query.queryHelperService', [
'wps',
'user',
'CONFIG',
function (wps, user, CONFIG) {
    this.buildLayerName = function (prefix, dataLayer) {
        var timestamp = moment().utc().format('YYMMDDHHmmss');
        return prefix + '_' + dataLayer.replace(/[^A-Za-z\d]+/g, '_') + '_' + timestamp + '_' + user.getStrippedCn();
    };
    // arg contains inputFeatures, dataLayer, dataLayerFilter, bufferMeters
    this.doGeoJsonQuery = function (arg, name, template) {
        var storeName = CONFIG.app.context + '.user.' + user.getStrippedCn();
        var resultLayer = this.buildLayerName(name.substring(0, 3), arg.dataLayer);
        var templateFn = stealth.jst[template];
        var req = templateFn(_.merge(arg, {
            output: {
                workspace: storeName, // for now, workspace also takes storeName
                store: storeName,
                name: resultLayer,
                keywords: [
                    CONFIG.app.context + '.output.' + name
                ].join()
            }
        }));
        return wps.submit(CONFIG.geoserver.defaultUrl, req, CONFIG.geoserver.omitProxy);
    };
    this.doGeoJsonTubeQuery = function (arg) {
        var name = 'tube',
            template = 'wps/tube_geojson.xml';
        return this.doGeoJsonQuery(arg, name, template);
    };
    this.doGeoJsonProximityQuery = function (arg) {
        var name = 'proximity',
            template = 'wps/proximity_geojson.xml';
        return this.doGeoJsonQuery(arg, name, template);
    };
}])
;
