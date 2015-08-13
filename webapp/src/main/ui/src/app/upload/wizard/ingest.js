/**
 * The final step of the wizard launches a GeoMesa ingest. On success, the user closes the wizard to
 * trigger layer updates.
 */
angular.module('stealth.upload.wizard.ingest', [
    'stealth.core.geo.ows',
    'stealth.core.utils',
    'stealth.core.wizard'
])

.constant('stealth.upload.wizard.ingest.Constant', {
    templateUrl: 'wps/wps-import.xml',
    processIdentifierConfigKey: 'upload.process',
    defaultProcessIdentifier: 'geomesa:IngestCSV'
})

.factory('stealth.upload.wizard.ingest.StepFactory', [
'stealth.core.utils.WidgetDef',
'stealth.core.wizard.Step',
function (WidgetDef, Step) {
    var self = {
        createStep: function (wizardScope, setup, teardown) {
            var widget = new WidgetDef('st-up-wiz-ingest', wizardScope);
            return new Step('Ingest into GeoServer', widget, null, true, setup, teardown);
        }
    };
    return self;
}])

/**
 * This service is responsible for understanding the backend's IngestCSV WPS process.
 * By default, this is the geomesa:IngestCSV process (per the constant above), but geomesa:UserLockingIngestCSV
 * is also an option. The different behavior is controlled by CONFIG.
 */
.service('stealth.upload.wizard.ingest.importService', [
'CONFIG',
'wps',
'stealth.upload.wizard.ingest.Constant',
function (CONFIG, wps, ingestConstant) {
    var wpsUrl = function () {
        return CONFIG.geoserver.defaultUrl + "/ows";
    };
    var parseSuccess = function (data) {
        return {
            layerName: data
        };
    };
    var parseFailure = function (error) {
        return {
            errorMessage: error
        };
    };
    var processIdentifier = function () {
        return _.get(CONFIG, ingestConstant.processIdentifierConfigKey, ingestConstant.defaultProcessIdentifier);
    };
    this.submit = function (csvId, sftName, onSuccess, onFailure) {
        var templateFn = stealth.jst[ingestConstant.templateUrl];
        var xmlRequest = templateFn({
            processIdentifier: processIdentifier(),
            csvId: csvId,
            context: CONFIG.app.context,
            sftName: sftName
        });
        wps.submit(wpsUrl(), xmlRequest, CONFIG.geoserver.omitProxy, true)
            .then(
                function (data) { if (_.isFunction(onSuccess)) { onSuccess(parseSuccess(data)); } },
                function (error) { if (_.isFunction(onFailure)) { onFailure(parseFailure(error)); } }
            );
    };
}])

.controller('stealth.upload.wizard.ingest.SchemaController', [
'$scope',
'stealth.upload.wizard.ingest.importService',
'stealth.upload.wizard.schema.typesService',
function ($scope, importService, typesService) {
    if (!$scope.file.submit) {
        $scope.file.submit = function () {
            var success = function (response) {
                $scope.file.ingest.message = "File successfully ingested into " + response.layerName;
                $scope.file.ingest.complete = true;
                $scope.wizardForm.$invalid = false;
            };
            var failure = function (response) {
                $scope.file.ingest.isError = true;
                $scope.loadError = response.errorMessage;
            };
            importService.submit($scope.file.uuid, $scope.file.feature, success, failure);
        };
    }
    if (!$scope.file.updateType) {
        $scope.file.updateType = function () {
            $scope.file.ingest.started = true;
            var geomParams = {};
            if ($scope.file.geom) {
                geomParams.type = "geom";
                geomParams.geomName = $scope.file.geom.name;
            } else {
                geomParams.type = "latlon";
                geomParams.latName = $scope.file.lat.name;
                geomParams.lonName = $scope.file.lon.name;
            }
            var typeParams = {
                name: $scope.file.feature,
                schema: $scope.file.schema,
                geom: geomParams
            };
            var baseUrl = $scope.file.proxy + $scope.file.baseUri;
            var success = function () {
                $scope.file.submit();
            };
            var failure = function (errorMessage) {
                $scope.loadError = errorMessage;
            };
            typesService.updateType(baseUrl, $scope.file.uuid, typeParams, success, failure);
        };
    }
    $scope.file.ingest = {
        started: false,
        complete: false
    };
    $scope.loadError = null;
}])

.directive('stUpWizIngest',
function () {
    return {
        restrict: 'E',
        controller: 'stealth.upload.wizard.ingest.SchemaController',
        templateUrl: 'upload/wizard/templates/ingest.tpl.html'
    };
})
;
