angular.module('stealth.core.interaction.mappopup')

/**
 * Tabbed display within map popup container.
 */
.directive('stOl3MapPopupTabs', [
function () {
    return {
        restrict: 'A',
        require: '^stOl3MapPopup',
        templateUrl: 'core/interaction/mappopuptabs.tpl.html',
        link: function (scope, element, attrs, mapPopCtrl) { //eslint-disable-line no-unused-vars
            mapPopCtrl.launchSearch();
            scope.$on('Results Loaded', function () {
                _.each(mapPopCtrl.results, function (tab) {
                    tab.widgetDef.getScope().tab = tab;
                });
                scope.tabs = _.sortBy(mapPopCtrl.results, 'level');
                scope.focusTab();
            });
            scope.removeTab = function (tab) {
                _.pull(scope.tabs, tab);
                scope.activeTabIdx = 0;
                if (_.isFunction(tab.onTabBlur)) {
                    tab.onTabBlur();
                }
                if (scope.tabs.length === 0) {
                    mapPopCtrl.closePopup();
                } else {
                    scope.focusTab();
                }
            };
            scope.focusTab = function () {
                if (_.isFunction(scope.tabs[scope.activeTabIdx].onTabFocus)) {
                    scope.tabs[scope.activeTabIdx].onTabFocus();
                }
            };
            scope.blurTab = function () {
                if (_.isFunction(scope.tabs[scope.activeTabIdx].onTabBlur)) {
                    scope.tabs[scope.activeTabIdx].onTabBlur();
                }
            };
            scope.$on('$destroy', function () {
                if (angular.isDefined(scope.tabs) &&
                    angular.isDefined(scope.tabs[scope.activeTabIdx])) {
                    scope.blurTab();
                }
            });
        },
        controller: ['$scope', function ($scope) {
            $scope.activeTabIdx = 0;
            $scope.setActiveTabIdx = function (newIdx) {
                $scope.blurTab();
                $scope.activeTabIdx = newIdx;
                $scope.focusTab();
            };
        }]
    };
}])
;
