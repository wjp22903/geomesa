angular.module('stealth.histogram.popup')

.service('histogramBuilder', [
'$log',
'$rootScope',
'$interval',
'elementAppender',
function ($log, $rootScope, $interval, elementAppender) {
    var scopes = [];

    var getScope = function (histId) {
        return _.find(scopes, function (scope) {
            return scope.histogram.histId == histId;
        });
    };

    var buildHistogram = function (histogram) {
        var scope = getScope(histogram.histId);

        scope.histogram.updateBars = function (histogram) {
            scope.viz.updateBars({}, {
                fill: histogram.fillColor,
                stroke: histogram.fillColor
            });
        };

        var elId = '#' + histogram.histId;
        scope.viz = sonic.viz(elId, [], {
            animation: {
                delay: 0,
                duration: 500
            }
        })
        .addYAxis({
            min: 0,
            label: {text: 'counts'}
        });
// TODO: Add click listeners for WMS callbacks.
//        .addListeners({
//            'viz-body-wide': {
//                click: function () {
//                    $log.debug(arguments);
//                }
//            }
//        });

        if (_.isUndefined(histogram.yScale)) {
            histogram.yScale = 'linear';
        }

        var maxNBins;
        switch (histogram.type) {
            case 'number':
                scope.viz.addXAxis({
                    type: 'linear',
                    label: {text: histogram.xLabel},
                    pad: {
                        min: 0.1,
                        max: 0.1
                    }
                });
                maxNBins = histogram.nBinsChoices[histogram.nBinsChoices.length - 1];
                if (_.isUndefined(histogram.nBinsChoice)) {
                    histogram.nBinsChoice = 512;
                }
                histogram.currentNBins = histogram.nBinsChoice;
                histogram.maxBinned = fill(maxNBins, histogram.min, histogram.max, histogram.data);
                if (_.isUndefined(histogram.minBin)) {
                    histogram.minBin = 1;
                }
                if (_.isUndefined(histogram.maxBin)) {
                    histogram.maxBin = histogram.currentNBins;
                }
                rebin(histogram);
                break;

            case 'date-time':
                scope.viz.addXAxis({
                    type: 'time',
                    label: {text: histogram.xLabel},
                    pad: {
                        min: (histogram.max - histogram.min) * 0.1,
                        max: (histogram.max - histogram.min) * 0.1
                    }
                });
                maxNBins = histogram.nBinsChoices[histogram.nBinsChoices.length - 1];
                if (_.isUndefined(histogram.nBinsChoice)) {
                    histogram.nBinsChoice = 512;
                }
                histogram.currentNBins = histogram.nBinsChoice;
                histogram.maxBinned = fill(maxNBins, histogram.min, histogram.max, histogram.data);
                if (_.isUndefined(histogram.minBin)) {
                    histogram.minBin = 1;
                }
                if (_.isUndefined(histogram.maxBin)) {
                    histogram.maxBin = histogram.currentNBins;
                }
                rebin(histogram);
                break;

            case 'string':
                scope.viz.addXAxis({
                    type: 'ordinal',
                    ticks: {
                        rotate: -45,
                        dx: -25,
                        dy: 4
                    },
                    label: {
                        text: histogram.xLabel,
                        dy: 30
                    }
                });
                histogram.nBinsChoice = histogram.data.length;
                histogram.currentNBins = histogram.nBinsChoice;
                if (_.isUndefined(histogram.minBin)) {
                    histogram.minBin = 1;
                }
                if (_.isUndefined(histogram.maxBin)) {
                    histogram.maxBin = histogram.nBinsChoice;
                }
                histogram.maxBinned = fill(histogram.currentNBins, histogram.min, histogram.max, histogram.data);
                histogram.currentBinned = fill(histogram.currentNBins, histogram.min, histogram.max, histogram.data);
                rebin(histogram);
                break;
        }

        scope.viz.addBars({
            fill: histogram.fillColor,
            stroke: histogram.fillColor,
            animation: {
                delay: 0,
                duration: 0
            },
            minBarWidth: 1,
            maxBarWidth: 1000,
            barGroupPadding: 0,
            strokeWidth: 0,
            zoom: true
// TODO: Change bar tooltip to show bin numbers.
//            tooltip: {
//
//            }
        })
        .addCrosshair();

        histogram.viewState.isLoading = false;
    };

    var updateHistogram = function (histogram) {
        switch (histogram.type) {
            case 'number':
                maxNBins = histogram.nBinsChoices[histogram.nBinsChoices.length - 1];
                histogram.maxBinned = fill(maxNBins, histogram.min, histogram.max, histogram.data);
                histogram.minBin = 1;
                histogram.maxBin = histogram.currentNBins;
                rebin(histogram);
                break;

            case 'date-time':
                maxNBins = histogram.nBinsChoices[histogram.nBinsChoices.length - 1];
                histogram.maxBinned = fill(maxNBins, histogram.min, histogram.max, histogram.data);
                histogram.minBin = 1;
                histogram.maxBin = histogram.currentNBins;
                rebin(histogram);
                break;

            case 'string':
                histogram.nBinsChoice = histogram.data.length;
                histogram.currentNBins = histogram.nBinsChoice;
                histogram.minBin = 1;
                histogram.maxBin = histogram.nBinsChoice;
                histogram.maxBinned = fill(histogram.currentNBins, histogram.min, histogram.max, histogram.data);
                histogram.currentBinned = fill(histogram.currentNBins, histogram.min, histogram.max, histogram.data);
                rebin(histogram);
                break;
        }
        histogram.viewState.isLoading = false;
    };

    var stepLeft = function (histogram) {
        if (histogram.minBin > 1) {
            var shift = (0.02 * histogram.nBinsChoice) | 0;
            histogram.minBin -= shift;
            histogram.maxBin -= shift;
        }
        rebin(histogram);
    };

    var stepRight = function (histogram) {
        if (histogram.maxBin < histogram.nBinsChoice) {
            var shift = (0.02 * histogram.nBinsChoice) | 0;
            histogram.minBin += shift;
            histogram.maxBin += shift;
        }
        rebin(histogram);
    };

    var reset = function (histogram) {
        histogram.minBin = 1;
        histogram.maxBin = histogram.nBinsChoice;
        rebin(histogram);
    };

    var rebin = function (histogram) {
        var scope = getScope(histogram.histId);
        setXLimits(histogram);
        histogram.currentNBins = histogram.nBinsChoice;
        setYScale(histogram);
        histogram.currentBinned = _.slice(histogram.currentBinned, histogram.minBin - 1, histogram.maxBin);
        scope.viz.data(histogram.currentBinned);
    };

    var setXLimits = function (histogram) {
        var scaler = histogram.nBinsChoice / histogram.currentNBins;
        if (histogram.minBin > 1) {
            histogram.minBin = (histogram.minBin * scaler) | 0;
        }
        histogram.maxBin = (histogram.maxBin * scaler) | 0;

        if (histogram.minBin < 1) {
            histogram.minBin = 1;
        }
        if (histogram.maxBin < 1) {
            histogram.maxBin = 1;
        }
        if (histogram.minBin > histogram.nBinsChoice) {
            histogram.minBin = histogram.nBinsChoice;
        }
        if (histogram.maxBin > histogram.nBinsChoice) {
            histogram.maxBin = histogram.nBinsChoice;
        }
    };

    var setYScale = function (histogram) {
        var scope = getScope(histogram.histId);

        if (histogram.yScale === 'log') {
            histogram.currentBinned = fill(histogram.currentNBins, histogram.min, histogram.max, histogram.maxBinned, function (binned) {
                _.each(binned, function (datum) {
                    if (datum.y > 0) {
                        datum.y = math.log10(datum.y);
                    }
                });
            });
            scope.viz.updateYAxis({},{label: {text: 'log(counts)'}});
        } else {
            histogram.currentBinned = fill(histogram.currentNBins, histogram.min, histogram.max, histogram.maxBinned);
            scope.viz.updateYAxis({},{label: {text: 'counts'}});
        }
    };

    var fill = function (nBins, min, max, sortedData, transform) {
        var binned = [];

        if (_.isString(min) && _.isString(max)) {
            binned = angular.copy(sortedData);
        }

        if (_.isNumber(min) && _.isNumber(max)) {
            var binWidth = (max - min) / nBins;
            binned = _.map(_.range(1, nBins+1), function (bin) {
                return {
                    id: bin,
                    x: min + (bin+0.5) * binWidth,
                    y: 0
                };
            });

            var currBin = 0;
            _.each(sortedData, function (datum) {
                while (datum.x > binned[currBin].x + 0.5*binWidth) {
                    currBin++;
                }

                binned[currBin].y += datum.y;
            });
        }

        if (_.isFunction(transform)) {
            transform(binned);
        }

        return binned;
    };

    var closePopup = function (histogram) {
        var scope = getScope(histogram.histId);
        histogram.viewState.toggledOn = false;
        scope.viz = undefined;
        scope.$destroy();
        _.pull(scopes, scope);
        angular.element('.' + histogram.histId + '-container').remove();
        scope.unhighlightLayer(histogram.layerId);
    };

    this.build = function (histogram, isUpdate) {
        if (isUpdate) {
            updateHistogram(histogram);
            return;
        }

        var scope = $rootScope.$new();
        scope.highlightLayer = histogram.highlightLayer;
        scope.unhighlightLayer = histogram.unhighlightLayer;
        scope.histogram = histogram;
        scope.histId = 'histogram-' + scope.histogram.id;
        scope.histogram.histId = scope.histId;
        scopes.push(scope);
        var histEl;
        elementAppender.append('.primaryDisplay', 'histogram/popup/container.tpl.html', scope, function (el) {
            histEl = el;
        });

        scope.histogram.rebin = rebin;
        scope.histogram.closePopup = closePopup;
        scope.histogram.reset = reset;
        scope.histogram.stepLeft = stepLeft;
        scope.histogram.stepRight = stepRight;

        var waiting;
        var stopWaiting = function () {
            $interval.cancel(waiting);
            waiting = undefined;
        };

        waiting = $interval(function () {
            if (!_.isUndefined(histEl)) {
                buildHistogram(histogram);
                stopWaiting();
            }
        }, 250);
    };

}])

.directive('stHistogramPopup', [
'$log',
'$rootScope',
function ($log, $rootScope) {
    return {
        restrict: 'E',
        templateUrl: 'histogram/popup/popup.tpl.html',
        link: function (scope, el, attrs) {
            el.parent().css('height', 0);

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

            var unregHistoPopupFocusListener = $rootScope.$on('histogram:focus', function (evt, popupId) {
                if (popupId == attrs.id) {
                    scope.focus();
                    el.children().css('box-shadow', '0px 0px 25px #00c7ff');
                }
            });

            var unregHistoPopupUnhighlightListener = $rootScope.$on('histogram:unhighlight', function (evt, popupId) {
                if (popupId == attrs.id) {
                    el.children().css('box-shadow', 'none');
                }
            });

            scope.$on('$destroy', function () {
                unregFocusListener();
                unregHistoPopupFocusListener();
                unregHistoPopupUnhighlightListener();
                el.draggable('destroy');
            });
        }
    };
}])

;