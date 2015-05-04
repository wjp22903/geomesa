angular.module('stealth.core.interaction.mappopup')

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
