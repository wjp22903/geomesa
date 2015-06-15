angular.module('stealth.imagery.omar.results.category', [
    'stealth.core.geo.analysis.category'
])

.factory('stealth.imagery.omar.results.category.Category', [
'stealth.core.geo.analysis.category.AnalysisCategory',
function (AnalysisCategory) {
    var Category = function (title, onClose) {
        AnalysisCategory.apply(this, [title, 'fa-image', onClose]);
    };
    Category.prototype = Object.create(AnalysisCategory.prototype);
    return Category;
}])
;
