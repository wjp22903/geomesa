angular.module('stealth.targetpri.results', [
    'stealth.core.geo.analysis.category'
])

.factory('stealth.targetpri.results.Category', [
'stealth.core.geo.analysis.category.AnalysisCategory',
function (AnalysisCategory) {
    var Category = function (title, onClose) {
        AnalysisCategory.apply(this, [title, 'fa-crosshairs', onClose]);
    };
    Category.prototype = Object.create(AnalysisCategory.prototype);
    return Category;
}])
;
