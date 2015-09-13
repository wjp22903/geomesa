angular.module('stealth.p2p.geo.query')

.service('p2pService', [
'wps',
'CONFIG',
function (wps, CONFIG) {
    this.doP2PQuery = function (q) {
        var spatial =
                new OpenLayers.Filter.Spatial({
                    type: OpenLayers.Filter.Spatial.BBOX,
                    property: q.params.geomField.name,
                    value: new OpenLayers.Bounds(q.params.minLon, q.params.minLat, q.params.maxLon, q.params.maxLat)
                });

        var timeFilter = new OpenLayers.Filter.Comparison({
            type: OpenLayers.Filter.Comparison.BETWEEN,
            property: q.params.dtgField.name,
            lowerBoundary: q.params.startDtg.toISOString(),
            upperBoundary: q.params.endDtg.toISOString()
        });

        var customCQL = _.isEmpty(q.params.cql) ? null : new OpenLayers.Format.CQL().read(q.params.cql);

        var filt =
                new OpenLayers.Filter.Logical({
                    type: OpenLayers.Filter.Logical.AND,
                    filters: _.isEmpty(customCQL) ? [spatial, timeFilter] : [spatial, timeFilter, customCQL]
                });

        var queryRef = {
            mimeType: 'text/xml',
            identifier: 'gs:Query',
            dataInputs: [
                {
                    identifier: 'features',
                    reference: {
                        mimeType: 'text/xml',
                        href: 'http://geoserver/wfs',
                        method: 'POST',
                        body: {
                            wfs: {
                                featureType: q.featureTypeData.featureTypes[0].typeName,
                                version: '1.0.0',
                                srsName: 'EPSG:4326',
                                featureNS: q.featureTypeData.targetNamespace,
                                featurePrefix: q.featureTypeData.targetPrefix,
                                outputFormat: 'GML2',
                                filter: filt
                            }
                        }
                    }
                }
            ],
            responseForm: {
                rawDataOutput: {
                    mimeType: 'application/json',
                    identifier: 'result'
                }
            }
        };

        var p2p = {
            mimeType: 'text/xml',
            identifier: 'geomesa:Point2Point',
            dataInputs: [
                {
                    identifier: 'data',
                    reference: {
                        mimeType: 'text/xml',
                        href: 'http://geoserver/wps',
                        method: 'POST',
                        body: queryRef
                    }
                },
                {
                    identifier: 'groupingField',
                    data: {
                        literalData: {value: q.params.groupingField.name}
                    }
                },
                {
                    identifier: 'sortField',
                    data: {
                        literalData: {value: q.params.sortField.name}
                    }
                },
                {
                    identifier: 'minimumNumberOfPoints',
                    data: {
                        literalData: {value: '2'}
                    }
                },
                {
                    identifier: 'breakOnDay',
                    data: {
                        literalData: {value: 'false'}
                    }
                }
            ],
            responseForm: {
                rawDataOutput: {
                    mimeType: 'application/json',
                    identifier: 'result'
                }
            }
        };

        var req = new OpenLayers.Format.WPSExecute({
            writers: _.extend(OpenLayers.Format.WPSExecute.prototype.writers, {gml: OpenLayers.Format.GML.v3.prototype.writers.gml})
        }).write(p2p);

        return wps.submit(CONFIG.geoserver.defaultUrl, req, CONFIG.geoserver.omitProxy);
    };
}]);
