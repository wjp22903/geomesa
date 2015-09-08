angular.module('stealth.core.utils')

// Directive signature:
//
// <div class="cell">
//     <input type="range" ng-model="store.opacity"
//            min="0" max="100" step="1"
//            st-change="store.setOpacity(store.opacity)"
//            st-change-delay="100"
//            st-float-input>
// </div>
//
// note: st-change-delay must be greater than '0' if you override
//       if you need a delay of '0' use ng-change.

.directive('stChange', [
'$timeout',
function ($timeout) {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function (scope, element, attr, ctrl) { //eslint-disable-line no-unused-vars
            // get st-change-delay or grab the default 300ms
            var delay = _.parseInt(_.get(attr, 'stChangeDelay')) || 300;
            var currentOp = null;
            ctrl.$viewChangeListeners.push(function () {
                $timeout.cancel(currentOp);
                currentOp = $timeout(function () {
                    scope.$eval(attr.stChange);
                }, delay);
            });
        }
    };
}])
;
