angular.module('stealth.routeanalysis.runner')

.run([
'$rootScope',
'routeAnalysisRunner',
function ($rootScope, routeAnalysisRunner) {
    $rootScope.$on('routeanalysis:request:route', function (evt, req, catScope, layer) { //eslint-disable-line no-unused-vars
        routeAnalysisRunner.run(req, catScope, layer);
    });
}])

.service('routeAnalysisRunner', [
'toastr',
'analysisService',
function (toastr, analysisService) {
    this.run = function (req, catScope, layer) {
        analysisService.doGeoJsonLineQuery([req.dataSource], {
            inputGeoJson: req.routeFeature,
            resolution: req.resolution,
            color: layer.params.fillColor
        }).then(function (response) {
            if (!_.isUndefined(response.results)) {
                layer.routeanalysis.response = response;
                catScope.showRouteAnalysis(layer.routeanalysis);
            } else {
                toastr.error('Failed to get a response, check route is within raster bounds',
                    'Request Error', {timeOut: 15000});
                catScope.removeLayer(layer.gsLayer, layer);
            }
        });
    };
}])
;
