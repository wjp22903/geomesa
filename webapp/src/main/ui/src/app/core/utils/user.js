angular.module('stealth.core.utils')

.service('user', [
'CONFIG',
function (CONFIG) {
    //Returns current user's CN
    this.getCn = function () {
        return CONFIG.userCn;
    };
    //Returns current user's CN with all non-word chars removed
    this.getStrippedCn = function () {
        return this.getCn().replace(/\W/g, '');
    };
}])
;
