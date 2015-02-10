angular.module('stealth.static.wizard', [
    'stealth.core.geo.ows'
])

.factory('stealth.static.wizard.Query', [
'$log',
'wms',
'wfs',
'CONFIG',
function ($log, wms, wfs, CONFIG) {
    var tag = 'stealth.static.wizard.Query: ';

    var idSeq = 1;
    var now = moment().utc();
    var oneWeekAgo = now.clone().subtract(7, 'days');

    var Query = function () {
        var _self = this;

        _self.layerData = {};
        _self.params = {
            title: 'Query ' + idSeq++,
            geomField: null,
            maxLat: 90,
            minLat: -90,
            maxLon: 180,
            minLon: -180,
            startDtg: oneWeekAgo,
            endDtg: now,
            cql: null,
            markerStyle: 'point',
            markerShape: 'circle',
            size: 9,
            fillColor: '#000000'
        };

        this.getFeatureTypeDescription = function (layer) {
            _self.layerData.error = null;
            _self.featureTypeData = null;
            _self.params.geomField = null;

            wfs.getFeatureTypeDescription(CONFIG.geoserver.defaultUrl,
                                          layer.Name,
                                          CONFIG.geoserver.omitProxy)
            .then(
                function (data) {
                    _self.featureTypeData = data;
                    if (data.error) { // Response is successful,
                                      // but no description is
                                      // found for the type.
                        _self.featureTypeData = 'unavailable';
                    } else {
                        var dtg = _.find(_self.featureTypeData.featureTypes[0].properties, {'name': 'dtg'});
                        if (dtg !== undefined) {
                            _self.params.dtgField = dtg;
                        }
                        var geom = _.find(_self.featureTypeData.featureTypes[0].properties, {'name': 'geom'});
                        if (geom !== undefined) {
                            _self.params.geomField = geom;
                        }
                    }
                },
                function (error) {
                    _self.layerData.error =
                        'GetFeatureTypeDescription request failed. Error: ' +
                        error.status + ' ' + error.statusText;
                }
            );
        };
    };

    return Query;
}])

;