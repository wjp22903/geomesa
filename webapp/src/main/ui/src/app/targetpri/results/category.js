angular.module('stealth.targetpri.results', [
    'stealth.core.geo.analysis.category'
])

.factory('stealth.targetpri.results.Category', [
'stealth.core.geo.analysis.category.AnalysisCategory',
'stealth.targetpri.wizard.TargetpriCookies',
function (AnalysisCategory, TP) {
    var Category = function (title, onClose) {
        AnalysisCategory.apply(this, [title, TP.icon, onClose]);
    };
    Category.prototype = Object.create(AnalysisCategory.prototype);
    return Category;
}])
;
