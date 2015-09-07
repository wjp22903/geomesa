angular.module('stealth.core.popup.components', [
    'stealth.core.popup'
])

.directive('stPopupTabContainer', [
'stealth.core.popup.popupManager',
function (popupManager) {
    return {
        restrict: 'E',
        templateUrl: 'core/popup/components/tabcontainer.tpl.html',
        controller: ['$scope', function ($scope) {
            var _focusTab = function () {
                if (_.isFunction($scope.tabs[$scope.activeTabIdx].onTabFocus)) {
                    $scope.tabs[$scope.activeTabIdx].onTabFocus();
                }
            };
            var _blurTab = function () {
                if (_.isFunction($scope.tabs[$scope.activeTabIdx].onTabBlur)) {
                    $scope.tabs[$scope.activeTabIdx].onTabBlur();
                }
            };

            $scope.activeTabIdx = 0;
            $scope.tabs = _.sortBy($scope.results, 'level');
            $scope.setActiveTabIdx = function (newIdx) {
                _blurTab();
                $scope.activeTabIdx = newIdx;
                _focusTab();
            };
            $scope.removeTab = function (tab) {
                _.pull($scope.tabs, tab);
                $scope.activeTabIdx = 0;
                if (_.isFunction(tab.onTabBlur)) {
                    tab.onTabBlur();
                }
                if ($scope.tabs.length === 0) {
                    popupManager.closePopup($scope.popupId);
                } else {
                    _focusTab();
                }
            };

            // Register map listeners.
            $scope.$on('$destroy', function () {
                if (angular.isDefined($scope.tabs) &&
                    angular.isDefined($scope.tabs[$scope.activeTabIdx])) {
                    _blurTab();
                }
            });

            _.forEach($scope.results, function (tab) {
                tab.widgetDef.getScope().tab = tab;
                tab.widgetDef.getScope().onRemoveAll = function () {
                    $scope.removeTab(tab);
                };
            });
            _focusTab();
        }]
    };
}])
;
