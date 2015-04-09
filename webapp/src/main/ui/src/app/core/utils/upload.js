angular.module('stealth.core.utils')

// Directive signature:
//  - The 'id' attribute is optional.
//  - Technically the 'process-file' attribute is optional, but this directive
//    assumes that you want to do something with the file once it has been loaded.
//
//  <st-upload-file id="upload1" process-file="callback(file)"></st-upload-file>
.directive('stUploadFile',[
'$log',
'$rootScope',
function ($log, $rootScope) {
    var tag = 'stealth.core.utils.stUploadFile: ';
    $log.debug(tag + 'directive defined');
    return {
        restrict: 'E',
        templateUrl: 'core/utils/upload.tpl.html',
        scope: {
            process: '&processFile',
            tooltip: '@?tooltipText'
        },
        link: function (scope, el, attrs) {
            var uploadId = _.uniqueId();
            scope.fileInputId = function () {
                return ('hidden-input-id-' + (attrs.id || uploadId));
            };

            scope.upload = function () {
                $log.debug(tag + 'upload() called');
                var inputId = scope.fileInputId();
                var e = document.getElementById(inputId);
                e.value = null;
                scope.$evalAsync(function () {
                    e.click();
                });
                $rootScope.$emit('FileUploadLaunched');
            };

            scope.fileSelected = function (element) {
                var file = element.files[0];
                $log.debug(tag + 'file selected = "' + file.name + '"');
                scope.process({file: file});
            };

            scope.defaultTooltip = "<span style='white-space:nowrap'>Load file</span>";
        }
    };
}])

;
