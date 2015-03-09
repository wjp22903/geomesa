angular.module('stealth.core.startmenu.popover', [
    'ui.bootstrap'
])

.directive('stStartPopPopup',
function () {
    return {
        restrict: 'EA',
        replace: true,
        scope: { title: '@', content: '@', placement: '@', animation: '&', isOpen: '&' },
        templateUrl: 'template/popover/popover.html'
    };
})

.directive('stStartPop', [
'$tooltip', '$timeout',
function ($tooltip, $timeout) {
    var tooltip = $tooltip('stStartPop', 'stStartPop', 'event');
    var compile = angular.copy(tooltip.compile);
    tooltip.compile = function (element, attrs) {
      var parentCompile = compile(element, attrs);
      return function(scope, element, attrs ) {
        var first = true;
        attrs.$observe('stStartPopShow', function (val) {
          if (JSON.parse(!first || val || false)) {
            $timeout(function () {
              element.triggerHandler('event');
            });
          }
          first = false;
        });
        parentCompile(scope, element, attrs);
      };
    };
    return tooltip;
}])
;
