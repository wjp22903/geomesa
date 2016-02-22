angular.module('stealth.grizzlybear.wizard.query', [
])
.factory('stealth.grizzlybear.wizard.query.BtQuery', [
'$q',
'wfs',
'CONFIG',
function ($q, wfs, CONFIG) {

    var BtQuery = function () {
        var _self = this;


        _self.dateArray = [];
        _self.current = null;

        $q.all([
            wfs.getFeature(
                CONFIG.geoserver.defaultUrl + '/gb_jw9bn',
                'gb_jw9bn:BatchTime',
                true,
                {},
                'text',
                false
            )
        ]).then(function (response) {
            var timeFeatures = response[0];

            _self.dateArray = timeFeatures.data.features
                .map(function (d) {
                    return moment.tz(d.properties.batchTime, 'utc');
                })
                .sort(function (a, b) {
                    return a.valueOf() - b.valueOf();
                });

            if (_self.dateArray.length !== 0) {
                _self.current = _self.dateArray[_self.dateArray.length - 1];
            }
        });

/*
        _self.dateArray = formattedTimeFeatures;
        if (_self.dateArray.length !== 0) {
            _self.current = _self.dateArray[_self.dateArray.length - 1];
        }
*/
    };

    return BtQuery;
}])
;
