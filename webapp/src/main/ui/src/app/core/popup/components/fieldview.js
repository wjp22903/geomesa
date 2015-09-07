angular.module('stealth.core.popup.components')

.controller('fieldViewController', [
'$scope',
'$modalInstance',
'$timeout',
function ($scope, $modalInstance, $timeout) {
    $scope.close = function () {
        $modalInstance.close();
    };
    $scope.selectAllText = function ($event, millisDelay) {
        $timeout(function () {
            $event.delegateTarget.select();
        }, millisDelay);
    };
}])
;
