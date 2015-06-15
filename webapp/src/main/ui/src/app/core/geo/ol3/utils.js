angular.module('stealth.core.geo.ol3.utils', [
])

.service('stealth.core.geo.ol3.utils.geomHelper', [
function () {
    var flipPt = function (yx) {
        var size = _.size(yx);
        if (size === 2) {
            return [yx[1], yx[0]];
        } else if (size === 3) {
            return [yx[1], yx[0], yx[2]];
        } else {
            return yx;
        }
    };
    var flipDeep = function (a) {
        if (_.isArray(a[0])) {
            return _.map(a, flipDeep);
        } else {
            return flipPt(a);
        }
    };

    this.flipXY = function (geom) {
        geom.setCoordinates(flipDeep(geom.getCoordinates()));
    };
}])
;
