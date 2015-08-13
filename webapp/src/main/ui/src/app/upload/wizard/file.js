/**
 * This module roughly corresponds to the first step of the wizard,
 * which is uploading the file to the backend.
 *
 * This module uses the blueimp-file-upload jquery extension
 */
angular.module('stealth.upload.wizard.file', [
    'stealth.core.utils',
    'stealth.core.wizard'
])

/**
 * Create a Step to be used in Wizard creation, to support file upload.
 */
.factory('stealth.upload.wizard.file.StepFactory', [
'stealth.core.utils.WidgetDef',
'stealth.core.wizard.Step',
function (WidgetDef, Step) {
    var self = {
        createStep: function (wizardScope, setup, teardown) {
            var widget = new WidgetDef('st-up-wiz-file', wizardScope);
            return new Step('File upload', widget, null, true, setup, teardown);
        }
    };
    return self;
}])

/**
 * Constroller for the stUpWizFile directive, below.
 */
.controller('stealth.upload.wizard.file.Controller', [
'$scope',
function ($scope) {
    if (!$scope.file.upload) {
        $scope.file.upload = {
            started: false,
            finished: false,
            percent: 0,
            add: function (e, data) { // eslint-disable-line no-unused-vars
                $scope.$apply(function () {
                    $scope.file.upload.started = true;
                    $scope.file.upload.percent = 0;
                    $scope.file.upload.status = 'Please wait...';
                    data.url = $scope.file.proxy + $scope.file.baseUri;
                    data.submit();
                });
            },
            progress: function (e, data) { // eslint-disable-line no-unused-vars
                $scope.$apply(function () {
                    $scope.file.upload.percent = parseInt(data.loaded / data.total * 100, 10);
                });
            },
            done: function (e, data) { // eslint-disable-line no-unused-vars
                $scope.$apply(function () {
                    $scope.file.upload.percent = 100;
                    $scope.file.upload.finished = true;
                    $scope.file.upload.status = 'Upload complete.';
                    $scope.file.uuid = data.result;
                });
            }
        };
    }
    $scope.loadError = null;
}])

// custom validator that waits for our file to upload - this keeps the wizard from advancing
.directive('asyncupload', function () {
    return {
        require: 'ngModel',
        link: function (scope, elm, attrs, ctrl) { // eslint-disable-line no-unused-vars
            ctrl.$validators.asyncupload = function () {
                return scope.file.upload.finished;
            };
        }
    };
})

.directive('stUpWizFile',
function () {
    return {
        restrict: 'E',
        templateUrl: 'upload/wizard/templates/file.tpl.html',
        controller: 'stealth.upload.wizard.file.Controller',
        link: function (scope, element) {
            element.fileupload({
                dataType: 'text',
                add: scope.file.upload.add,
                progress: scope.file.upload.progress,
                done: scope.file.upload.done
            });
        }
    };
})
;
