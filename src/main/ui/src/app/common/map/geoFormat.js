angular.module('stealth.common.map.geoFormat', [
])
    .service('GeoFormat', [
        function () {
            var _coordFormat = {
                dmshCombined: 0
            };

            function formatCoordForCsv (coord, coordFormat) {
                switch (coordFormat) {
                    case _coordFormat.dmshCombined:
                        var lonLat = new OpenLayers.LonLat(coord),
                            lat = decimalToDmsh(lonLat.lat, 'lat')
                                .replace(/[^0-9\.NnSs]/g, ''),
                            lon = decimalToDmsh(lonLat.lon, 'lon')
                                .replace(/[^0-9\.EeWw]/g, '');
                        if (lon.search(/\D/) < 7) {
                            lon = '0' + lon;
                        }
                        return [lat.toUpperCase() + ' ' + lon.toUpperCase()];
                }
            }
            function parseCoordFromCsv (csvValuesArr, coordFormat) {
                switch (coordFormat) {
                    case _coordFormat.dmshCombined:
                        var dms = csvValuesArr[0].split(' ');
                        if (dms[1].search(/\D/) < 7) {
                            dms[1] = '0' + dms[1];
                        }
                        var lonHIdx = dms[1].length - 1,
                            latHIdx = dms[0].length - 1,
                            lon = dmshToDecimal(parseInt(dms[1].substr(0, 3)), parseInt(dms[1].substr(3, 2)), parseFloat(dms[1].substring(5, lonHIdx)), dms[1].substr(lonHIdx, 1)),
                            lat = dmshToDecimal(parseInt(dms[0].substr(0, 2)), parseInt(dms[0].substr(2, 2)), parseFloat(dms[0].substring(4, latHIdx)), dms[0].substr(latHIdx, 1));
                        return [lon, lat];
                }
            }
            function dmshToDecimal (d, m, s, h) {
                var decimal = d;
                m += s / 60;
                decimal += m / 60;
                h = h.toUpperCase();
                if (h == 'S' || h == 'W') {
                    decimal *= -1;
                }
                return decimal;
            }
            function decimalToDmsh (coordinate, axis) {
                var dmsOption = 'dms';

                coordinate = (coordinate+540)%360 - 180; // normalize for sphere being round

                var abscoordinate = Math.abs(coordinate);
                var coordinatedegrees = Math.floor(abscoordinate);

                var coordinateminutes = (abscoordinate - coordinatedegrees)/(1/60);
                var tempcoordinateminutes = coordinateminutes;
                coordinateminutes = Math.floor(coordinateminutes);
                var coordinateseconds = (tempcoordinateminutes - coordinateminutes)/(1/60);
                coordinateseconds =  Math.round(coordinateseconds*100);
                coordinateseconds /= 100;

                if( coordinateseconds >= 60) {
                    coordinateseconds -= 60;
                    coordinateminutes += 1;
                    if( coordinateminutes >= 60) {
                        coordinateminutes -= 60;
                        coordinatedegrees += 1;
                    }
                }

                if( coordinatedegrees < 10 ) {
                    coordinatedegrees = "0" + coordinatedegrees;
                }
                var str = coordinatedegrees + "\u00B0";

                if (dmsOption.indexOf('dm') >= 0) {
                    if( coordinateminutes < 10 ) {
                        coordinateminutes = "0" + coordinateminutes;
                    }
                    str += coordinateminutes + "'";

                    if (dmsOption.indexOf('dms') >= 0) {
                        if( coordinateseconds < 10 ) {
                            coordinateseconds = "0" + coordinateseconds;
                        }
                        str += coordinateseconds + '"';
                    }
                }

                if (axis == "lon") {
                    str += coordinate < 0 ? OpenLayers.i18n("W") : OpenLayers.i18n("E");
                } else {
                    str += coordinate < 0 ? OpenLayers.i18n("S") : OpenLayers.i18n("N");
                }
                return str;
            }
            this.decimalToDmsh = decimalToDmsh;

            this.coordFormat = _coordFormat;

            this.geoJsonToCsv = function (geoJson, coordFormat, coordColumns) {
                var fields = [],
                    csv = '';
                //gather fields
                _.each(geoJson.properties.pointData.features, function (feature) {
                    var coordArr = formatCoordForCsv(feature.geometry.coordinates, coordFormat);
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

            function csvToGeoJsonObj (csv, geometryType, coordFormat, coordColumns) {
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
                            coord = parseCoordFromCsv(coord, coordFormat);
                            jsonObj.geometry.coordinates.push(coord);
                            jsonObj.properties.pointData.features.push({
                                index: index,
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
                var parser = new OpenLayers.Format.GeoJSON(),
                    features = parser.read(csvToGeoJsonObj(csv, geometryType, coordFormat, coordColumns));
                //Augment buried point info with vertex IDs
                switch (geometryType) {
                    case 'LineString':
                        _.each(features[0].geometry.getVertices(), function (vertex, index) {
                            features[0].attributes.pointData.features[index].id = vertex.id;
                        });
                        break;
                }
                return features;
            };
        }
    ])
;
