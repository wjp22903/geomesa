angular.module('stealth.core.utils')

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
'$log',
'$compile',
function ($log, $compile) {
    $log.debug('stealth.core.utils.stWidgetCompiler: directive defined');
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

.factory('stealth.core.utils.WidgetDef', [
'$log',
'$rootScope',
function ($log, $rootScope) {
    $log.debug('stealth.core.utils.WidgetDef: factory started');
    var WidgetDef = function (directive, scope, isoScopeAttrs) {
        var _directive = directive;
        var _scope = scope || $rootScope.$new();
        var _isoScopeAttrs = isoScopeAttrs || '';

        this.getDirective = function () { return _directive; };
        this.getScope = function () { return _scope; };
        this.getIsoScopeAttrs = function () { return _isoScopeAttrs; };
    };
    return WidgetDef;
}])

.service('elementAppender', [
'$templateCache',
'$compile',
function ($templateCache, $compile) {
    this.append = function (parentSelector, templateId, scope, setCompiled) {
        var parent = angular.element(parentSelector);
        var child = angular.element($templateCache.get(templateId));
        var newEl = {};
        // This is a work-around for
        // https://github.com/angular/angular.js/issues/4203
        // taken from
        // https://gist.github.com/sjbarker/11048078
        var dereg = scope.$watch(newEl, function () {
            var compiled = $compile(newEl)(scope);
            parent.append(compiled);
            if (_.isFunction(setCompiled)) {
                setCompiled(compiled);
            }
            dereg();
        });
        newEl = angular.element(child);
    };
}])
;
