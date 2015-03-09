angular.module('stealth.core.utils')

.service('cqlHelper', [
function () {
    this.buildDtgFilter = function (dtgField, startDtg, endDtg) {
        var cql = 'INCLUDE';
        if (startDtg && endDtg) {
            cql = '(' + dtgField + ' DURING ' + startDtg.toISOString() + '/' + endDtg.toISOString() + ')';
        } else if (startDtg) {
            cql = '(' + dtgField + ' AFTER ' + startDtg.toISOString() + ')';
        } else if (endDtg) {
            cql = '(' + dtgField + ' BEFORE ' + endDtg.toISOString() + ')';
        }
        return cql;
    };
}])
;
