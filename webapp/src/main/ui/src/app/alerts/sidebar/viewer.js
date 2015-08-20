angular.module('stealth.alerts.sidebar', [
    'stealth.alerts.manager',
    'stealth.core.sidebar'
])

.run([
'$rootScope',
'sidebarManager',
'stealth.core.utils.WidgetDef',
function ($rootScope, sidebarManager, WidgetDef) {
    sidebarManager.addButton('Alerts', 'fa-exclamation-triangle', 400,
                             new WidgetDef('st-alerts-viewer', $rootScope.$new()),
                             undefined,
                             true);
}])

.directive('stAlertsViewer', [
'$log',
'alertsManager',
function ($log, alertsManager) {
    $log.debug('stealth.alerts.sidebar.stAlertsViewer: directive defined');
    return {
        restrict: 'E',
        replace: true,
        templateUrl: 'alerts/sidebar/viewer.tpl.html',
        controller: ['$scope', function ($scope) {
            $scope.workspaces = alertsManager.getWorkspaces();
            $scope.alerts = alertsManager.getAlerts();
            $scope.selectedAlert = alertsManager.getSelectedAlert();

            $scope.selectAlert = function (alert) {
                if (!alertsManager.isSelected(alert)) {
                    alertsManager.selectAlert(alert);
                } else {
                    alertsManager.deselectAlert();
                }
            };

            $scope.toggleLayerAlerts = alertsManager.toggleLayerAlerts;
            $scope.isSelected = alertsManager.isSelected;
            $scope.name = '';
            $scope.capabilities = {};
        }]
    };
}])

.directive('stAlertsContainer', [
'$timeout',
'$window',
function ($timeout, $window) {
    return {
        restrict: 'A',
        link: function (scope, element) {
            var detailsElement = element.siblings(':last');
            var resizeContainer = function () {
                $timeout(function () {
                    var sidebarHeight = element.parent().height();
                    var workspaceHeight = element.siblings(':first').children().map(function (i, e) { //eslint-disable-line no-unused-vars
                        return angular.element(e).outerHeight(true);
                    }).get().reduce(function (a, b) { return a + b; });
                    var detailsHeight = detailsElement.outerHeight(true);
                    element.height(sidebarHeight - (workspaceHeight + detailsHeight));
                });
            };
            resizeContainer();
            angular.element($window).bind('resize', function () {
                resizeContainer();
            });
            scope.$watch(
                function () {
                    return detailsElement.outerHeight(true);
                },
                function (newValue, oldValue) {
                    if (newValue !== oldValue) {
                        resizeContainer();
                    }
                }
            );
        }
    };
}])
;
