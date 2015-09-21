angular.module('stealth.core.popup.components', [
    'ccri.angular-utils',
    'stealth.core.utils'
])

.directive('stPopupPagedTable', [
'$filter',
function ($filter) {
    return {
        restrict: 'E',
        scope: {
            result: '=',
            onRemoveAll: '=',
            numColumns: '=?',
            columnMinWidth: '=?'
        },
        templateUrl: 'core/popup/components/pagedtable.tpl.html',
        controller: ['$element', '$scope', function ($element, $scope) {
            var records = $scope.result.records;
            var numColumns = $scope.numColumns || 4;
            var columnMinWidth = $scope.columnMinWidth || 100;
            var rowWidth = columnMinWidth * Math.min(records.length, numColumns) + 75;

            $scope.columns = _.range(0, numColumns);
            $scope.keys = _.keys(records[0]);

            $scope.paging = {
                suggestedPage: 1,
                currentPage: 1,
                pageSize: $scope.columns.length,
                checkSuggestedPage: function () {
                    if ($scope.paging.suggestedPage > 0 &&
                        $scope.paging.suggestedPage <= $scope.paging.numberOfPages()) {
                        $scope.paging.currentPage = $scope.paging.suggestedPage;
                    }
                },
                numberOfPages: function () {
                    var num = 0;
                    if (_.isArray(records)) {
                        num = Math.ceil(records.length/$scope.paging.pageSize);
                    }
                    return num;
                },
                previousPage: function () {
                    $scope.paging.currentPage = $scope.paging.currentPage < 2 ?
                        $scope.paging.numberOfPages() : $scope.paging.currentPage - 1;
                    $scope.paging.suggestedPage = $scope.paging.currentPage;
                },
                nextPage: function () {
                    $scope.paging.currentPage = $scope.paging.currentPage >= $scope.paging.numberOfPages() ?
                        1 : $scope.paging.currentPage + 1;
                    $scope.paging.suggestedPage = $scope.paging.currentPage;
                },
                getColumnRecordIndex: function (col) {
                    return (($scope.paging.currentPage - 1) * $scope.paging.pageSize) + col;
                }
            };

            $scope.rowStyle = {
                'min-width': rowWidth + 'px',
                'width': rowWidth + 'px'
            };

            $scope.removeTable = function () {
                if (_.isFunction($scope.onRemoveAll)) {
                    $scope.onRemoveAll();
                }
                $element.remove();
                $scope.$destroy();
            };

            $scope.recordExists = function (col) {
                return ($scope.paging.getColumnRecordIndex(col) < records.length);
            };

            $scope.removeRecord = function (col) {
                if ($scope.recordExists(col)) {
                    _.pullAt(records, $scope.paging.getColumnRecordIndex(col));
                }
                if (_.isEmpty(records)) {
                    $scope.removeTable();
                } else {
                    var numPages = $scope.paging.numberOfPages();
                    if ($scope.paging.currentPage > numPages) {
                        $scope.paging.suggestedPage = numPages;
                        $scope.paging.checkSuggestedPage();
                    }
                }
            };

            $scope.getRecord = function (col) {
                if ($scope.recordExists(col)) {
                    return records[$scope.paging.getColumnRecordIndex(col)];
                }
                return undefined;
            };

            $scope.getColumnStyle = function (col) {
                var columnStyle = {
                    'min-width': columnMinWidth + 'px'
                };
                if (records.length < numColumns && !$scope.recordExists(col)) {
                    columnStyle.display = 'none';
                }
                return columnStyle;
            };

            /**
             * Format values if they are of a known type
             * @param {string} key - key of value to format
             * @param {*} value - value to format
             * @param {object} result - whole result
             *
             * @returns {{string|*}} Formatted value or original
             */
            $scope.formatValue = function (key, value) {
                if ($scope.result.fieldTypes) {
                    var type = _.find($scope.result.fieldTypes, {'name': key});
                    if (type && type.localType) {
                        switch (type.localType) {
                            case 'date-time':
                                return moment.utc(value).format('YYYY-MM-DD[T]HH:mm:ss[Z]');
                            case 'number':
                                return $filter('numberTrim')(value, 4);
                        }
                    }
                } else if (_.isNumber(value)) {
                    return $filter('numberTrim')(value, 4);
                }
                return value;
            };
        }]
    };
}])

.directive('stPagedTableResizable',
function () {
    return {
        restrict: 'A',
        link: function (scope, element) {
            element.resizable({
                start: function () {
                    element.find('.tableRow').css('width', '');
                },
                resize: function (event, ui) { //eslint-disable-line no-unused-vars
                    element.siblings().find('.tableRow').width(element.find('.tableRow').width());
                    element.siblings().width(ui.size.width);
                },
                containment: '.primaryDisplay'
            });
            scope.$on('$destroy', function () {
                if (element.resizable('instance')) {
                    element.resizable('destroy');
                }
            });
        }
    };
})

.directive('stPagedTableScrollLink',
function () {
    return {
        restrict: 'A',
        link: function (scope, element) { //eslint-disable-line no-unused-vars
            element.scroll(function () {
                element.parent().siblings().children('.tableRow').css('margin-left', -1 * element.scrollLeft());
            });
        }
    };
})
;
