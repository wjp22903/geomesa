/**
 * The third step of file upload it to define how to read the geometry.
 *
 * The geometry can either be a single column (i.e., wkt), or build from lat and lon columns.
 * At the moment, if any 'geom' column is present, we assume the user will pick that, and don't even let them
 * try to pick a lat/lon column. We can change this behavior in a future ticket if desired.
 */
angular.module('stealth.upload.wizard.geom', [
    'stealth.core.utils',
    'stealth.core.wizard',
    'stealth.upload.wizard.types'
])

.factory('stealth.upload.wizard.geom.StepFactory', [
'stealth.core.utils.WidgetDef',
'stealth.core.wizard.Step',
function (WidgetDef, Step) {
    var self = {
        createStep: function (wizardScope, setup, teardown) {
            var widget = new WidgetDef('st-up-wiz-geom', wizardScope);
            return new Step('Select Geometry', widget, null, true, setup, teardown);
        }
    };
    return self;
}])

.controller('stealth.upload.wizard.geom.SchemaController', [
'$scope',
'stealth.upload.wizard.types.attributeTypeService',
function ($scope, attributeTypeService) {
    $scope.file.geoms = _.filter($scope.file.schema, function (value) {
        return attributeTypeService.isGeom(value.binding);
    });
    $scope.file.latlons = _.filter($scope.file.schema, function (value) {
        return attributeTypeService.okForLatLon(value.binding);
    });
    $scope.loadError = null;
}])

.directive('stUpWizGeom',
function () {
    return {
        restrict: 'E',
        controller: 'stealth.upload.wizard.geom.SchemaController',
        templateUrl: 'upload/wizard/templates/geom.tpl.html'
    };
})
;
