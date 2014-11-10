angular.module('stealth.core.utils', [
])

.directive('stWidgetCompiler', [
'$rootScope', '$compile',
function ($rootScope, $compile) {
    return {
        scope: {
            scope: '='
        },
        link: function(scope, element, attrs) {
            var html = '<' + attrs.directive + '></' + attrs.directive + '>',
                el = angular.element(html),
                compiled = $compile(el);
            element.append(el);
            compiled(scope.scope || $rootScope.$new());
        }
    };
}])
;
