angular.module('stealth.core.interaction.resulttable', [
    'stealth.core.utils'
])

.controller('searchResultTableController', [
'$element',
'$scope',
'$filter',
'$timeout',
'$interval',
function ($element, $scope, $filter, $timeout, $interval) {
    var maxColWidth = parseInt($scope.maxColWidth, 10);
    var resizable = ($scope.resizable === 'true');

    var columns = ['RowKey', 'Col0', 'Col1', 'Col2', 'Col3'];
    var firstLayout = true;
    var tableBody = $element.children('.searchResultTableResize').children('.searchResultTableBody');
    var tableHeader = $element.children('.searchResultTableHeader');

    /**
     * Layout the result table.
     * @param {object} result
     */
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
    /**
     * Refresh the table layout.
     * @param {object} updatedResult
     */
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
                if ($scope.initMaxWidth < $element.children(':first-child').width() || !resizable) {
                    $element.children().width($scope.initMaxWidth);
                } else {
                    $element.children().width($element.children(':first-child').width());
                }
                var resizeElement = $element.children('.searchResultTableResize');
                if ($scope.initMaxHeight < resizeElement.height() || !resizable) {
                    resizeElement.height($scope.initMaxHeight);
                }
                firstLayout = false;
            }
        });
    };
    /**
     * Prepare for table layout update.
     * @param {object} result
     */
    var prepareTableUpdate = function (result) {
        var resultHeader = tableHeader.children('.result' + result.id + 'Header');
        resultHeader.width(resultHeader.width());
        resultHeader.children('.searchResultTableHeaderRow').css('visibility', 'hidden');
        var resultBody = tableBody.children('.result' + result.id + 'Body');
        resultBody.width(resultBody.width());
        resultBody.css('visibility', 'hidden');
    };

    /**
     * Remove a record from a result.
     * @param {object} result
     * @param {object} record
     */
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
    /**
     * Remove result from list.
     * @param {object} result - to remove
     */
    this.removeResult = function (result) {
        _.pull($scope.results, result);
        if ($scope.results.length === 0) {
            $scope.onRemoveAll();
        }
    };
    /**
     * Format values if they are of a known type
     * @param {string} key - key of value to format
     * @param {*} value - value to format
     * @param {object} result - whole result
     *
     * @returns {{string|*}} Formatted value or original
     */
    this.formatValue = function (key, value, result) {
        if (result.fieldTypes) {
            var type = _.find(result.fieldTypes, {'name': key});
            if (type && type.localType) {
                switch (type.localType) {
                    case 'date-time':
                        return moment.utc(value).format('YYYY-MM-DD[T]HH:mm:ss[Z]');
                    case 'number':
                        return $filter('numberTrim')(value, 4);
                }
            }
        } else {
            if (_.isNumber(value)) {
                return $filter('numberTrim')(value, 4);
            }
        }
        return value;
    };

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

    // Wait until element is displayed, then refresh layout.
    var checkDisplay = $interval(function () {
        var display = $element.parent().css('display');
        if (display !== 'none') {
            $interval.cancel(checkDisplay); //cancel further checks
            refreshLayout();
        }
    }, 100);
}])

.directive('stOl3MapPopupSearchResultTable', [
function () {
    return {
        restrict: 'EA',
        controller: 'searchResultTableController',
        controllerAs: 'resultTableCtrl',
        scope: {
            results: '=',
            onRemoveAll: '&',
            maxColWidth: '@',
            resizable: '@'
        },
        templateUrl: 'core/interaction/resulttable.tpl.html',
        require: '^stOl3MapPopup',
        link: function (scope, element, attrs, mapPopCtrl) {
            scope.onRemoveAll = function () {
                scope.$parent.$parent.removeTab(scope.$parent.tab);
            };
            scope.initMaxWidth = mapPopCtrl.maxWidth;
            scope.initMaxHeight = mapPopCtrl.maxHeight;
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
                    if (element.resizable('instance')) {
                        element.resizable('destroy');
                    }
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
