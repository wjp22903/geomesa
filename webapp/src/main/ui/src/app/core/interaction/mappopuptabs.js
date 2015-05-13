angular.module('stealth.core.interaction.mappopup')

/**
 * Tabbed display within map popup container.
 */
.directive('stOl3MapPopupTabs', [
'$rootScope',
'stealth.core.utils.WidgetDef',
function ($rootScope, WidgetDef) {
    return {
        restrict: 'A',
        require: '^stOl3MapPopup',
        templateUrl: 'core/interaction/mappopuptabs.tpl.html',
        link: function (scope, element, attrs, mapPopCtrl) {
            mapPopCtrl.launchSearch();
            scope.$on('Results Loaded', function () {
                _.each(mapPopCtrl.results, function (tab) {
                    tab.widgetDef.getScope().tab = tab;
                });
                scope.tabs = _.sortBy(mapPopCtrl.results, 'level');
            });
            scope.removeTab = function (tab) {
                _.pull(scope.tabs, tab);
                scope.activeTabIdx = 0;
                if (scope.tabs.length === 0) {
                    mapPopCtrl.closePopup();
                }
            };
        },
        controller: ['$scope', function ($scope) {
            $scope.activeTabIdx = 0;
            $scope.setActiveTabIdx = function (newIdx) {
                $scope.activeTabIdx = newIdx;
            };
        }]
    };
}])
;
