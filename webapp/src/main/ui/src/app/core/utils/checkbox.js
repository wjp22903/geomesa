angular.module('stealth.core.utils')

.directive('stealth.core.utils.checkbox',
function () {
    return {
        templateUrl: 'core/utils/checkbox.tpl.html',
        scope: {
            checked: '=',
            toggle: '&',
            tooltipText: '@?',
            tooltipPlacement: '@?'
        }
    };
})
;
