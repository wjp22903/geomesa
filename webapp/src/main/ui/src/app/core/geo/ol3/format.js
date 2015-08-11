angular.module('stealth.core.geo.ol3.format')

.service('csvFormat', [
'stealth.core.geo.ol3.format.GeoJson',
function (GeoJson) {
    var _coordFormat = {
        dmshCombined: 0
    };

    function _formatCoordForCsv (coord, coordFormat) {
        switch (coordFormat) {
            case _coordFormat.dmshCombined:
                var lat = _decimalToPaddedDmsh(coord[1], 'lat', 'dms')
                        .replace(/[^0-9\.NnSs]/g, ''),
                    lon = _decimalToPaddedDmsh(coord[0], 'lon', 'dms')
                        .replace(/[^0-9\.EeWw]/g, '');
                return [lat.toUpperCase() + ' ' + lon.toUpperCase()];
        }
    }
    function _parseCoordFromCsv (csvValuesArr, coordFormat) {
        switch (coordFormat) {
            case _coordFormat.dmshCombined:
                var dms = csvValuesArr[0].split(' ');
                if (dms[1].search(/\D/) < 7) {
                    dms[1] = '0' + dms[1];
                }
                var lonHIdx = dms[1].length - 1,
                    latHIdx = dms[0].length - 1,
                    lon = _dmshToDecimal(parseInt(dms[1].substr(0, 3), 10), parseInt(dms[1].substr(3, 2), 10), parseFloat(dms[1].substring(5, lonHIdx)), dms[1].substr(lonHIdx, 1)),
                    lat = _dmshToDecimal(parseInt(dms[0].substr(0, 2), 10), parseInt(dms[0].substr(2, 2), 10), parseFloat(dms[0].substring(4, latHIdx)), dms[0].substr(latHIdx, 1));
                return [lon, lat];
        }
    }
    function _dmshToDecimal (d, m, s, h) {
        var decimal = d;
        m += s / 60;
        decimal += m / 60;
        h = h.toUpperCase();
        if (h == 'S' || h == 'W') {
            decimal *= -1;
        }
        return decimal;
    }
    function _decimalToPaddedDmsh (coordinate, axis, dmsOption) {
        coordinate = (coordinate+540)%360 - 180; // normalize for sphere being round

        var abscoordinate = Math.abs(coordinate);
        var coordinatedegrees = Math.floor(abscoordinate);

        var coordinateminutes = (abscoordinate - coordinatedegrees)/(1/60);
        var tempcoordinateminutes = coordinateminutes;
        coordinateminutes = Math.floor(coordinateminutes);
        var coordinateseconds = (tempcoordinateminutes - coordinateminutes)/(1/60);
        coordinateseconds =  Math.round(coordinateseconds*100);
        coordinateseconds /= 100;

        if (coordinateseconds >= 60) {
            coordinateseconds -= 60;
            coordinateminutes += 1;
            if (coordinateminutes >= 60) {
                coordinateminutes -= 60;
                coordinatedegrees += 1;
            }
        }

        if (axis == 'lon') {
            if (coordinatedegrees < 10) {
                coordinatedegrees = '00' + coordinatedegrees;
            } else if (coordinatedegrees < 100) {
                coordinatedegrees = '0' + coordinatedegrees;
            }
        } else {
            if (coordinatedegrees < 10) {
                coordinatedegrees = '0' + coordinatedegrees;
            }
        }
        var str = coordinatedegrees + "\u00B0";

        if (dmsOption.indexOf('dm') >= 0) {
            if( coordinateminutes < 10 ) {
                coordinateminutes = "0" + coordinateminutes;
            }
            str += coordinateminutes + "'";

            if (dmsOption.indexOf('dms') >= 0) {
                if( coordinateseconds < 10 ) {
                    coordinateseconds = '0' + coordinateseconds;
                }
                str += coordinateseconds + '"';
            }
        }

        if (axis == 'lon') {
            str += coordinate < 0 ? 'W' : 'E';
        } else {
            str += coordinate < 0 ? 'S' : 'N';
        }
        return str;
    }

    this.coordFormat = _coordFormat;

    this.geoJsonToCsv = function (geoJson, coordFormat, coordColumns) {
        var fields = [],
            csv = '';
        //gather fields
        _.each(geoJson.properties.pointData.features, function (feature) {
            var coordArr = _formatCoordForCsv(feature.geometry.coordinates, coordFormat);
            _.each(coordColumns, function (column, index) {
                feature.properties[column] = coordArr[index];
            });
            fields = _.union(fields, _.keys(feature.properties));
        });
        //add data rows to csv
        _.each(geoJson.properties.pointData.features, function (feature) {
            var values = [];
            _.each(fields, function (field) {
                values.push(feature.properties[field]);
            });
            csv += values.join() + '\n';
        });
        return fields.join() + '\n' + csv;
    };

    function _csvToGeoJsonObj (csv, geometryType, coordFormat, coordColumns) {
        switch (geometryType) {
            case 'LineString':
                var jsonObj = {
                        type: 'Feature',
                        properties: {
                            pointData: { //holds data for each point in the line
                                type: 'FeatureCollection',
                                features: []
                            }
                        },
                        geometry: {
                            type: 'LineString',
                            coordinates: []
                        }
                    };

                _.each(d3.csv.parse(csv), function (properties, index) {
                    var coord = [];
                    _.each(coordColumns, function (column) {
                        coord.push(properties[column]);
                    });
                    coord = _parseCoordFromCsv(coord, coordFormat);
                    jsonObj.geometry.coordinates.push(coord);
                    jsonObj.properties.pointData.features.push({
                        id: _.now() + '_' + index,
                        type: 'Feature',
                        properties: properties,
                        geometry: {
                            type: 'Point',
                            coordinates: coord
                        }
                    });
                });
                return jsonObj;
            default:
                throw new Error('CSV parser cannot handle ' + geometryType);
        }
    }

    this.csvToFeatures = function (csv, geometryType, coordFormat, coordColumns) {
        var parser = new GeoJson(), // stealth GeoJson, extending OL3 for STEALTH-319
            features = parser.readFeatures(_csvToGeoJsonObj(csv.replace(/\r/g, ''), geometryType, coordFormat, coordColumns));
        return features;
    };
}])

.factory('stealth.core.geo.ol3.format.GeoJson', [
function () {
    var GeoJson = function (/* inherited */) {
        ol.format.GeoJSON.apply(this, arguments);
    };
    GeoJson.prototype = Object.create(ol.format.GeoJSON.prototype);

    GeoJson.prototype.writeFeatureObject = function (/* inherited */) {
        var object = ol.format.GeoJSON.prototype.writeFeatureObject.apply(this, arguments);
        if (object.properties === null) {
            object.properties = {};
        }
        return object;
    };

    GeoJson.prototype.writeFeaturesObject = function (/* inherited */) {
        var object = ol.format.GeoJSON.prototype.writeFeaturesObject.apply(this, arguments);
        if (_.isUndefined(object.crs)) {
            object.crs = {
                type: 'name',
                properties: {
                    name: this.defaultDataProjection.getCode()
                }
            };
        }
        return object;
    };

    return GeoJson;
}])

;
