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
                }
            }, scope.paging);
        }
    };
}])
;