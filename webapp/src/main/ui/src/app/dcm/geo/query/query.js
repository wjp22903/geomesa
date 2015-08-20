angular.module('stealth.dcm.geo.query')

.service('dcmQueryService', [
'wps',
'CONFIG',
'wfs',
'cqlHelper',
function (wps, CONFIG, wfs, cqlHelper) {
    this.cqlToFilterXml = function (cql_filter) {
        var filterXml = '';
        if (cql_filter) {
            filterXml += wfs.cqlToFilterXml(cql_filter);
        }
        return filterXml;
    };

    this.doDcmQuery = function (arg) {
        var templateFn = stealth.jst['wps/importRaster.xml'];
        var boundsArr = [arg.bounds.minLon, arg.bounds.minLat, arg.bounds.maxLon, arg.bounds.maxLat];
        var eventsFilterXml = this.cqlToFilterXml(
            cqlHelper.combine(cqlHelper.operator.AND, arg.events.cql_filter,
                cqlHelper.buildBboxFilter(arg.events.defaultGeomFieldName, boundsArr)));
        var req = templateFn({
            predictiveFeaturesWpsInput: this.getPredictiveFeaturesWpsInput(arg.predictiveFeatures),
            predictiveCoveragesWpsInput: this.getPredictiveCoveragesWpsInput(arg.predictiveCoverages),
            events: arg.events,
            width: arg.width,
            height: arg.height,
            sampleRatio: arg.sampleRatio,
            CRS: arg.CRS,
            featureSelection: arg.featureSelection,
            outputType: arg.outputType.output,
            workspace: arg.workspace.name,
            store: arg.title,
            name: arg.title,
            srsHandling: arg.srsHandling,
            keywords: arg.keywords,
            description: arg.description,
            aoWpsInput: this.getAoWpsInput(arg.geometry),
            eventsFilterXml: eventsFilterXml
        });
        return wps.submit(CONFIG.geoserver.defaultUrl, req, CONFIG.geoserver.omitProxy);
    };

    this.getStoreName = function (predictiveFeatures, predictiveCoverages, events) {
        var storeName = "";
        if (predictiveFeatures) {
            predictiveFeatures.forEach(function (predictiveFeature) {
                storeName += predictiveFeature.Title;
            });
        }
        if (predictiveCoverages) {
            predictiveCoverages.forEach(function (predictiveCoverage) {
                storeName = storeName + "-" + predictiveCoverage.Title;
            });
        }
        if (events && events.Title) {
            storeName = storeName + "-" + events.Title;
        }
        return storeName + "-DCM";
    };

    this.getPredictiveFeaturesWpsInput = function (predictiveFeatures) {
        var predictiveFeaturesWpsInput = '';
        if (predictiveFeatures) {
            predictiveFeatures.forEach(function (predFeature) {
                predictiveFeaturesWpsInput +=
                    '<wps:Input>' +
                        '<ows:Identifier>predictiveVectors</ows:Identifier>' +
                        '<wps:Reference mimeType="text/xml" xlink:href="http://geoserver/wfs" method="POST">' +
                            '<wps:Body>' +
                                '<wfs:GetFeature service="WFS" version="1.0.0" outputFormat="GML2">' +
                                    '<wfs:Query typeName="' + predFeature.Name + '">' +
                                    this.cqlToFilterXml(predFeature.cql_filter) +
                                    '</wfs:Query>' +
                                '</wfs:GetFeature>' +
                            '</wps:Body>' +
                        '</wps:Reference>' +
                    '</wps:Input>';
            }, this);
        }
        return predictiveFeaturesWpsInput;
    };

    this.getPredictiveCoveragesWpsInput = function (predictiveCoverages) {
        var predictiveCoveragesWpsInput = '';
        if (predictiveCoverages) {
            predictiveCoverages.forEach(function (predCoverage) {
                predictiveCoveragesWpsInput +=
                    '<wps:Input>'+
                        '<ows:Identifier>predictiveRasters</ows:Identifier>' +
                        '<wps:Reference mimeType="image/tiff" xlink:href="http://geoserver/wcs" method="POST">' +
                            '<wps:Body>' +
                                '<wcs:GetCoverage service="WCS" version="1.1.1">' +
                                    '<ows:Identifier>' + predCoverage.Name + '</ows:Identifier>' +
                                    '<wcs:DomainSubset>' +
                                        '<gml:BoundingBox crs="http://www.opengis.net/gml/srs/epsg.xml#4326">' +
                                            '<ows:LowerCorner>' + predCoverage.EX_GeographicBoundingBox[0] + " " + predCoverage.EX_GeographicBoundingBox[1] + '</ows:LowerCorner>' +
                                            '<ows:UpperCorner>' + predCoverage.EX_GeographicBoundingBox[2] + " " + predCoverage.EX_GeographicBoundingBox[3] + '</ows:UpperCorner>' +
                                        '</gml:BoundingBox>' +
                                    '</wcs:DomainSubset>' +
                                    '<wcs:Output format="image/tiff"/>' +
                                '</wcs:GetCoverage>' +
                            '</wps:Body>' +
                        '</wps:Reference>' +
                    '</wps:Input>';
            }, this);
        }
        return predictiveCoveragesWpsInput;
    };

    this.getAoWpsInput = function (geometry) {
        var aoWpsInput = '';
        if (geometry && geometry.length > 0) {
            aoWpsInput += '<wps:Input>' +
                '<ows:Identifier>ao</ows:Identifier>' +
                '<wps:Data>' +
                    '<wps:ComplexData mimeType="text/xml; subtype=gml/3.1.1"><![CDATA[' + geometry + ']]></wps:ComplexData>' +
                '</wps:Data>' +
            '</wps:Input>';
        }
        return aoWpsInput;
    };
}])
;
