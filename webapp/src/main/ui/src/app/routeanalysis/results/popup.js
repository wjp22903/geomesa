angular.module('stealth.routeanalysis.popup', [])

.service('routeAnalysisBuilder', [
'$log',
'$rootScope',
'$interval',
'elementAppender',
function ($log, $rootScope, $interval, elementAppender) {
    var scopes = [];

    var getScope = function (routeId) {
        return _.find(scopes, function (scope) {
            return scope.routeanalysis.routeId == routeId;
        });
    };

    var buildRouteAnalysis = function (routeanalysis) {

        var scope = getScope(routeanalysis.routeId);
        scope.routeanalysis.updateBars = function (routeanalysis) {
            scope.viz.updateBars({}, {
                fill: routeanalysis.fillColor,
                stroke: routeanalysis.fillColor
            });
        };

        var elId = '#' + routeanalysis.routeId;
        var waiting;
        var stopWaiting = function () {
            $interval.cancel(waiting);
            waiting = undefined;
        };

        var editTooltip = function (pointArray, mousePosition) {
          console.log(pointArray);
        };

        waiting = $interval(function () {
            if ($(elId)[0].getBoundingClientRect().width !== 0) {
                scope.viz = sonic.viz(elId, [routeanalysis.response.results])
                .addXAxis({
                    label: {text: 'Distance (m)'}
                })
                .addYAxis({
                    label: {text: routeanalysis.yAxis},
                    pad: {
                        top: 0.10,
                        bottom:0.10
                    }
                }).addLines({
                    seriesIndexes: [0],
                    sort: true,
                    tooltip: {
                        renderFn: function (pointArray, mousePosition) {
                            // TODO: account for multiple lines on same graph
                            return "<p>x: " + pointArray[0].point.x.toFixed(0) + "<br>" +
                                   "y: " + pointArray[0].point.y.toPrecision(3) + "</p>";
                        }
                    }
                });
                stopWaiting();
            }
        }, 500);


        if (_.isUndefined(routeanalysis.yScale)) {
            routeanalysis.yScale = 'linear';
        }

        routeanalysis.viewState.isLoading = false;
        routeanalysis.viewState.isWizardInProgress = false;
    };

    var updateRouteAnalysis = function (routeanalysis) {
        routeanalysis.viewState.isLoading = false;
    };

    var closePopup = function (routeanalysis) {
        var scope = getScope(routeanalysis.routeId);
        routeanalysis.viewState.toggledOn = false;
        scope.viz = undefined;
        scope.$destroy();
        _.pull(scopes, scope);
        angular.element('.' + routeanalysis.routeId + '-container').remove();
    };

    this.build = function (routeanalysis, isUpdate) {

        if (isUpdate) {
            updateRouteAnalysis(routeanalysis);
            return;
        }

        var scope = $rootScope.$new();
        scope.routeanalysis = routeanalysis;
        scope.routeId = 'routeanalysis-' + scope.routeanalysis.id;
        scope.routeanalysis.routeId = scope.routeId;
        scopes.push(scope);
        var routeEl;
        elementAppender.append('.primaryDisplay', 'routeanalysis/runner/container.tpl.html', scope, function (el) {
            routeEl = el;
        });

        scope.routeanalysis.closePopup = closePopup;


        var waiting;
        var stopWaiting = function () {
            $interval.cancel(waiting);
            waiting = undefined;
        };

        waiting = $interval(function () {
            if (!_.isUndefined(routeEl)) {
                buildRouteAnalysis(routeanalysis);
                stopWaiting();
            }
        }, 250);
    };

}])

.directive('stRouteAnalysisPopup', [
'$log',
'$rootScope',
function ($log, $rootScope) {
    return {
        restrict: 'E',
        templateUrl: 'routeanalysis/results/popup.tpl.html',
        link: function (scope, el, attrs) {
            el.parent().css('height', 5);

            el.draggable({
                stop: function (event, ui) {
                    scope.$apply(function () {
                        el.css('width', '');
                    });
                }
            });

            var unregFocusListener = $rootScope.$on('Popup Focus Change', function (evt, popupId) {
                if (popupId !== attrs.id && el.zIndex() > 85) {
                    el.css('z-index', el.zIndex() - 1);
                    el.children().css('box-shadow', 'none');
                }
            });

            scope.focus = function () {
                el.css('z-index', '92');
                $rootScope.$emit('Popup Focus Change', attrs.id);
            };

            scope.$on('$destroy', function () {
                unregFocusListener();
                el.draggable('destroy');
            });
        }
    };
}])

;