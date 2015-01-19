angular.module('stealth.core.utils')

.directive('stToggleVisibility',
function () {
    return {
        templateUrl: 'core/utils/visibility.tpl.html',
        scope: {
            visible: '=',
            toggle: '&'
        }
    };
})
;
