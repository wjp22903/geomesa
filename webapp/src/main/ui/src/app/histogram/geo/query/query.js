angular.module('stealth.histogram.geo.query')

.service('histogramQueryService', [
'$log',
'wps',
'CONFIG',
function ($log, wps, CONFIG) {

    this.doHistogramQuery = function (arg) {
        var templateFn = stealth.jst['wps/histogram_geojson.xml'];
        var req = templateFn({
            layer: arg.layer,
            filter: arg.filter,
            attr: arg.attribute
        });
        return wps.submit(CONFIG.geoserver.defaultUrl, req, CONFIG.geoserver.omitProxy);
    };
}])

;