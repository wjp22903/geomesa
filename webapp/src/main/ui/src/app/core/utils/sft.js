angular.module('stealth.core.utils', [
])

.constant('stealth.core.utils.SFTAttributeTypes', (function () {
    var simple = ["String", "Integer", "Long", "Double", "Float", "Boolean", "UUID", "Date"];
    var geom = ["Geometry", "Point", "LineString", "Polygon",
                "MultiPoint", "MultiLineString", "MultiPolygon", "GeometryCollection"];
    return {
        simple: simple,
        geom: geom,
        all: simple.concat(geom)
    };
})())
;
