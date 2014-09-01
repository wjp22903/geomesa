angular.module('stealth.common.panes.leftPane', [
])

    .directive('leftPane', [
    '$rootScope',
    function ($rootScope) {
        return {
            restrict: 'E',
            transclude: true,
            scope: {
                isVisible: '=isVisible'
            },
            templateUrl: 'common/panes/leftPane.tpl.html',
            link: function (scope, element, attrs) {
                scope.overlayId = attrs.overlayId ? attrs.overlayId : 'leftPaneOverlay';
                element.children()[0].children[1].id = scope.overlayId;
            },
            controller: function ($scope) {
                $rootScope.$on('ShowLeftPaneOverlay', function (event, element) {
                    angular.element(document.getElementById('targetRankLeftPaneOverlay'))
                        .append(element);
                    $scope.isVisible = true;
                    $scope.showLeftPaneOverlay = true;
                });
                $rootScope.$on('HideLeftPaneOverlay', function (event, selector) {
                    $scope.showLeftPaneOverlay = false;
                    angular.element(document.getElementById($scope.overlayId))
                        .find(selector).remove();
                });
            }
        };
    }])
;
