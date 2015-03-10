angular.module('stealth.core.interaction.resulttable', [
    'stealth.core.utils'
])

.controller('searchResultTableController', [
'$element',
'$scope',
'$filter',
'$timeout',
function ($element, $scope, $filter, $timeout) {

    var initMaxWidth = parseInt($scope.initMaxWidth, 10);
    var initMaxHeight = parseInt($scope.initMaxHeight, 10);
    var maxColWidth = parseInt($scope.maxColWidth, 10);
    var resizable = ($scope.resizable === 'true');

    var columns = ['RowKey', 'Col0', 'Col1', 'Col2', 'Col3'];
    var firstLayout = true;
    var tableBody = $element.children('.searchResultTableResize').children('.searchResultTableBody');
    var tableHeader = $element.children('.searchResultTableHeader');
    var doResultLayout = function (result) {
        var body = tableBody.children('.result' + result.id + 'Body');
        var header = tableHeader.children('.result' + result.id + 'Header');

        var rowElements = body.children().add(header.children('.searchResultTableHeaderRow'));
        _.forEach(columns, function (column) {
            var colElements = rowElements.children('.result' + result.id + column);
            var colWidths = colElements.map(function (i, colElement) {
                var wrapped = angular.element(colElement);
                wrapped.css('width', '');
                wrapped.css('height', '');
                return wrapped.width() + 1;
            }).get();
            if (colWidths.length > 0) {
                colElements.width(Math.min(maxColWidth, Math.max.apply(Math, colWidths)));
            }
        });
        rowElements.map(function (i, rowElement) {
            var wrapped = angular.element(rowElement);
            wrapped.children().height(wrapped.height());
        });

        header.css('width', '');
        body.css('width', '');
        if (body.outerWidth() < header.outerWidth()) {
            body.outerWidth(header.outerWidth());
        }
        header.children('.searchResultTableHeaderRow').css('visibility', '');
        body.css('visibility', '');
    };
    var refreshLayout = function (updatedResult) {
        $timeout(function () {
            if (updatedResult) {
                doResultLayout(updatedResult);
            } else {
                _.forEach($scope.results, function (result) {
                    doResultLayout(result);
                });
            }
            if (firstLayout) {
                var minParentWidth = $element.parent().children(':first-child').children().map(function (idx, elem) {
                    return angular.element(elem).outerWidth();
                }).get().reduce(function (prev, cur) { return prev + cur; }, 0);
                $element.children().css('min-width', minParentWidth + 4);
                if (initMaxWidth < $element.width() || !resizable) {
                    $element.children().width(initMaxWidth);
                } else {
                    $element.children().width($element.width());
                }
                var resizeElement = $element.children('.searchResultTableResize');
                if (initMaxHeight < resizeElement.height() || !resizable) {
                    resizeElement.height(initMaxHeight);
                }
                $element.parent().css('visibility', '');
                firstLayout = false;
            }
        });
    };
    var prepareTableUpdate = function (result) {
        var resultHeader = tableHeader.children('.result' + result.id + 'Header');
        resultHeader.width(resultHeader.width());
        resultHeader.children('.searchResultTableHeaderRow').css('visibility', 'hidden');
        var resultBody = tableBody.children('.result' + result.id + 'Body');
        resultBody.width(resultBody.width());
        resultBody.css('visibility', 'hidden');
    };



    this.removeRecord = function (result, record) {
        _.pull(result.records, record);

        if (result.records.length === 0) {
            this.removeResult(result);
            return;
        }

        prepareTableUpdate(result);
        var numPages = result.paging.numberOfPages();
        if (result.paging.currentPage > numPages) {
            result.paging.suggestedPage = result.paging.currentPage = numPages;
        }
        refreshLayout(result);
    };
    this.removeResult = function (result) {
        _.pull($scope.results, result);
        if ($scope.results.length === 0) {
            $scope.onRemoveAll();
        }
    };
    this.formatValue = function (key, value, result) {
        if (result.fieldTypes) {
            var type = _.find(result.fieldTypes, {'name': key});
            if (type && type.localType) {
                switch (type.localType) {
                    case 'date-time':
                        return moment.utc(value).format('YYYY-MM-DD[T]HH:mm:ss[Z]');
                    case 'number':
                        return $filter('numberTrim')(value, 5);
                    default:
                        return value;
                }
            }
        }
        return value;
    };

    $scope.$on('Results Loaded', function () {

        _.forEach($scope.results, function (result, idx) {
            result.id = idx;
            //Filter out empty fields
            var empty = _.reject(_.keys(result.records[0]), function (key) {
                return _.any(_.pluck(result.records, key), function (value) {
                    return !(_.isUndefined(value) || _.isNull(value) || (_.isString(value) && _.isEmpty(value.trim())));
                });
            });
            result.records = _.map(result.records, function (record) {
                return _.omit(record, empty);
            });

            result.paging = {
                suggestedPage: 1,
                currentPage: 1,
                pageSize: columns.length - 1,
                checkSuggestedPage: function () {
                    if (result.paging.suggestedPage > 0 &&
                        result.paging.suggestedPage <= result.paging.numberOfPages()) {
                        prepareTableUpdate(result);
                        result.paging.currentPage = result.paging.suggestedPage;
                        refreshLayout(result);
                    }
                },
                numberOfPages: function () {
                    var num = 0;
                    if (_.isArray(result.records)) {
                        num = Math.ceil(result.records.length/result.paging.pageSize);
                    }
                    return num;
                },
                previousPage: function () {
                    prepareTableUpdate(result);
                    result.paging.suggestedPage = (result.paging.currentPage = (result.paging.currentPage < 2) ? (result.paging.numberOfPages()) : (result.paging.currentPage-1));
                    refreshLayout(result);
                },
                nextPage: function () {
                    prepareTableUpdate(result);
                    result.paging.suggestedPage = (result.paging.currentPage = (result.paging.currentPage >= result.paging.numberOfPages()) ? 1 : (result.paging.currentPage+1));
                    refreshLayout(result);
                }
            };
        });
        refreshLayout();
    });
}])

.directive('stOl3MapPopupSearchResultTable', [
function () {
    return {
        restrict: 'A',
        controller: 'searchResultTableController',
        controllerAs: 'resultTableCtrl',
        scope: {
            results: '=',
            onRemoveAll: '&',
            initMaxWidth: '@',
            initMaxHeight: '@',
            maxColWidth: '@',
            resizable: '@'
        },
        templateUrl: 'core/interaction/resulttable.tpl.html',
        require: '^stOl3MapPopup',
        link: function (scope, element, attrs, mapPopCtrl) {
            mapPopCtrl.launchSearch();
        }
    };
}])

.directive('stSearchResultTableResizable',
function () {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            if (scope.resizable) {
                element.resizable({
                    resize: function (event, ui) {
                        element.siblings().width(ui.size.width);
                    }
                });
                scope.$on('$destroy', function () {
                    element.resizable('destroy');
                });
            }
        }
    };
})

.directive('stSearchResultTableScrollLink',
function () {
    return {
        restrict: 'A',
        link: function (scope, element) {
            element.scroll(function () {
                element.parent().siblings().children(':first-child').css('margin-left', -1 * element.scrollLeft());
            });
        }
    };
})
;
