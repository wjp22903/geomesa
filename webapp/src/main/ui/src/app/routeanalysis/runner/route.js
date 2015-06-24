angular.module('stealth.routeanalysis.runner')

.run([
'$rootScope',
'routeAnalysisRunner',
function ($rootScope, routeAnalysisRunner) {
    $rootScope.$on('routeanalysis:request:route', function (evt, req, catScope, layer) {
        routeAnalysisRunner.run(req, catScope, layer);
    });
}])

.service('routeAnalysisRunner', [
'toastr',
'analysisService',
function (toastr, analysisService) {
    var geoJsonFormat = new ol.format.GeoJSON();
    this.run = function (req, catScope, layer) {

        var routeName = 'Route for [' + req.name + ']';

        analysisService.doGeoJsonLineQuery([req.dataSource], {
            inputGeoJson: req.routeFeature,
            resolution: req.resolution,
            color: layer.params.fillColor
        }).then(function (response) {
            if (!_.isUndefined(response.results)) {
                layer.routeanalysis.response = response;
                catScope.showRouteAnalysis(layer.routeanalysis);
            }
            else {
                toastr.error('Failed to get a response, check route is within raster bounds',
                'Request Error', { timeOut: 15000 });
                catScope.removeLayer(layer.gsLayer, layer);
            }
        });
    };
}])
;