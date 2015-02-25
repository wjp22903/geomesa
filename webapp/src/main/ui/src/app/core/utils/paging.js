angular.module('stealth.core.utils')

.directive('stPager', [
function () {
    return {
        restrict: 'E',
        scope: {
            paging: '=?',
            records: '='
        },
        templateUrl: 'core/utils/paging.tpl.html',
        link: function (scope) {
            scope.paging = _.merge({
                suggestedPage: 1,
                currentPage: 1,
                pageSize: 20,
                checkSuggestedPage: function () {
                    if (scope.paging.suggestedPage > 0 &&
                        scope.paging.suggestedPage <= scope.paging.numberOfPages()) {
                        scope.paging.currentPage = scope.paging.suggestedPage;
                    }
                },
                numberOfPages: function () {
                    var num = 0;
                    if (_.isArray(scope.records)) {
                        num = Math.ceil(scope.records.length/scope.paging.pageSize);
                    }
                    return num;
                },
                previousPage: function () {
                    scope.paging.suggestedPage = (scope.paging.currentPage = (scope.paging.currentPage < 2) ? (scope.paging.numberOfPages()) : (scope.paging.currentPage-1));
                },
                nextPage: function () {
                    scope.paging.suggestedPage = (scope.paging.currentPage = (scope.paging.currentPage >= scope.paging.numberOfPages()) ? 1 : (scope.paging.currentPage+1));
                }
            }, scope.paging);
        }
    };
}])
;
