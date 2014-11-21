angular.module('stealth.core.utils', [
])

/**
 * Container for runtime insertion of directives.
 *
 * Ex usage:
 * You have a directive named myExample with an
 * isolated scope and a binding named myProp:
 * .directive('myExample', function () {
 *        return {
 *         scope: {myProp: '='},
 *         ...
 *     }
 * })
 *
 * To insert, use this html:
 * <st-widget-compiler widget-def="myWidgetDef">
 * </st-widget-compiler>
 *
 * ...assuming,
 * $scope.someScope.someProp = 'someValue';
 * $scope.myWidgetDef = new WidgetDef(
 *     'my-example', someScope, "my-prop='someProp'"
 * );
 *
 * In some cases, 2nd and 3rd params to WidgetDef
 * constructor are not required.
 */
.directive('stWidgetCompiler', [
'$compile',
function ($compile) {
    return {
        scope: {
            widgetDef: '='
        },
        link: function(scope, element, attrs) {
            scope.$watch('widgetDef', function (widget) {
                if (widget) {
                    element.empty(); //remove any previous widget
                    var html = '<' + widget.getDirective() + ' ' +
                        widget.getIsoScopeAttrs() +
                        '></' + widget.getDirective() + '>';
                    var el = angular.element(html);
                    var compiled = $compile(el);
                    element.append(el);
                    compiled(widget.getScope());
                }
            });
        }
    };
}])

.factory('WidgetDef', [
'$rootScope',
function ($rootScope) {
    var WidgetDef = function (directive, scope, isoScopeAttrs) {
        this.directive = directive;
        this.scope = scope || $rootScope.$new();
        this.isoScopeAttrs = isoScopeAttrs || '';
    };

    WidgetDef.prototype.getDirective = function () {
        return this.directive;
    };
    WidgetDef.prototype.getScope = function () {
        return this.scope;
    };
    WidgetDef.prototype.getIsoScopeAttrs = function () {
        return this.isoScopeAttrs;
    };
    return WidgetDef;
}])

.directive('stFloatSlider',
function () {
    return {
        require: 'ngModel',
        link: function(scope, element, attrs, controller) {
            controller.$parsers.unshift(function (sliderValue) {
                return parseFloat(sliderValue);
            });
        }
    };
})
;
