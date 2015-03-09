angular.module('stealth.core.utils')

// Directive signature:
//
// <st-toggle-map-layer
//         visible="isOnMap"
//         loading="isLoading"
//         toggle="callback()">
// </st-toggle-map-layer>

.directive('stToggleMapLayer', [
'$log',
function ($log) {
    var tag = 'stealth.core.utils.stToggleLayer: ';
    $log.debug(tag + 'directive defined');
    return {
        restrict: 'E',
        templateUrl: 'core/utils/toggleMapLayer.tpl.html',
        scope: {
            visible: '=',
            loading: '=',
            toggle: '&'
        }
    };
}])

;