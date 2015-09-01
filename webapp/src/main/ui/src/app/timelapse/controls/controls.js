angular.module('stealth.timelapse.controls')

.service('tlControlsManager', [
'$log',
'$interval',
'$rootScope',
function ($log, $interval, $rootScope) {
    var tag = 'stealth.timelapse.controls.tlControlsManager: ';
    $log.debug(tag + 'service started');

    var units = ['s', 'm', 'h', 'd'];

    function toMillis (val, unit) {
        switch (unit) {
            case 's':
                return (val * 1000);
            case 'm':
                return (val * 60000);
            case 'h':
                return (val * 3600000);
            case 'd':
                return (val * 86400000);
            default:
                return val;
        }
    }

    var controlsListeners = [];

    function notifyListeners () {
        var endMillis = toMillis(dtg.value, dtg.unit);
        var startMillis = Math.max(endMillis - window.millis, toMillis(dtg.min, dtg.unit));
        _.each(controlsListeners, function (listener) {
            listener(startMillis, dtg.millis, window.millis);
        });
    }

    function registerListener (listener) {
        controlsListeners.push(listener);
    }

    function unregisterListener (listener) {
        _.pull(controlsListeners, listener);
    }

    var dtg = {
        value: 0,
        min: 0,
        max: 86400,
        step: 1,
        unit: units[0], // seconds
        toMillis: toMillis,
        notifyListeners: notifyListeners
    };
    dtg.millis = toMillis(dtg.value, dtg.unit);

    var window = {
        value: 10,
        min: 0,
        max: 120,
        step: 1,
        unit: units[1], // minutes
        toMillis: toMillis,
        notifyListeners: notifyListeners
    };
    window.millis = toMillis(window.value, window.unit);

    var step = {
        value: 30,
        min: 0,
        max: 300,
        step: 1,
        unit: units[0], // seconds
        toMillis: toMillis,
        notifyListeners: notifyListeners
    };
    step.millis = toMillis(step.value, step.unit);

    var display = {
        toggledOn: false,
        activeWizard: false,
        isPlaying: false,
        isPaused: true,
        frameIntervalMillis: 16
    };

    function checkDtgLimits (t, min, max, step, window) {
        if (t < min || t >= (max + window + step)) {
            return min;
        } else if ((max + window) < t && t < (max + window + step)) {
            return max + window;
        } else {
            return t;
        }
    }

    display.stepForward = function () {
        var stepInSecs = step.millis / 1000;
        var windowInSecs = window.millis / 1000;
        var t = dtg.value + stepInSecs;
        dtg.value = checkDtgLimits(t, dtg.min, dtg.max, stepInSecs, windowInSecs);
        dtg.millis = toMillis(Math.min(dtg.value, dtg.max), dtg.unit);
        notifyListeners();
    };

    display.stepBack = function () {
        var stepInSecs = step.millis / 1000;
        var windowInSecs = window.millis / 1000;
        var t = dtg.value - stepInSecs;
        dtg.value = checkDtgLimits(t, dtg.min, dtg.max, stepInSecs, windowInSecs);
        dtg.millis = toMillis(dtg.value, dtg.unit);
        notifyListeners();
    };

    var playing = null;
    display.togglePlay = function () {
        display.isPlaying = !display.isPlaying;
        display.isPaused = !display.isPaused;

        if (display.isPlaying) {
            playing = $interval(function () {
                display.stepForward();
            }, display.frameIntervalMillis);
        } else if (playing) {
            $interval.cancel(playing);
            playing = null;
        }
    };

    display.windowBeginSecs = function () {
        var windowInSecs = window.millis / 1000;
        return (dtg.value - dtg.min < windowInSecs) ?
            dtg.min : dtg.value - windowInSecs;
    };

    // Responses to events emitted by BinStores.
    $rootScope.$on('timelapse:setDtgBounds', function (event, data) { //eslint-disable-line no-unused-vars
        $log.debug(tag + 'received "timelapse:setDtgBounds" message');

        if (!display.toggledOn) {
            display.toggledOn = true;
        }

        dtg.min = Math.floor(data.minInSecs);
        dtg.max = Math.ceil(data.maxInSecs);

        if (dtg.value < dtg.min) {
            dtg.value = dtg.min;
        }

        if (dtg.value > dtg.max) {
            dtg.value = dtg.max;
        }

        dtg.changed();  // Update internal copy.

        // Notify listeners that dtg value changed.
        // (If redraw listeners are registered, this should trigger a redraw as well.)
        notifyListeners();
    });

    $rootScope.$on('timelapse:resetDtgBounds', function () {
        display.toggledOn = false;

        dtg.value = 0;
        dtg.min = 0;
        dtg.max = 86400;
        dtg.millis = toMillis(dtg.value, dtg.unit);
        notifyListeners();
        if (display.isPlaying) {
            display.togglePlay();
        }
    });

    $rootScope.$on('wizard:launchWizard', function () {
        display.activeWizard = true;
        if (display.isPlaying) {
            display.togglePlay();
        }
    });

    $rootScope.$on('wizard:closeWizard', function () {
        display.activeWizard = false;
    });

    $rootScope.$on('FileUploadLaunched', function () {
        if (display.isPlaying) {
            display.togglePlay();
        }
    });

    // ***** API *****

    this.units = units;
    this.dtg = dtg;
    this.window = window;
    this.step = step;
    this.display = display;

    this.registerListener = function (listener) {
        registerListener(listener);
        return listener;
    };
    this.unregisterListener = function (listener) {
        unregisterListener(listener);
    };
}])

.controller('timeLapseControlsController', [
'$log',
'$scope',
'tlControlsManager',
function ($log, $scope, controlsMgr) {
    var tag = 'stealth.timelapse.controls.timeLapseControlsController: ';
    $log.debug(tag + 'controller started');

    $scope.units = controlsMgr.units;
    $scope.dtg = controlsMgr.dtg;
    $scope.window = controlsMgr.window;
    $scope.step = controlsMgr.step;
    $scope.display = controlsMgr.display;

    $scope.displayMillisInUtc = function (utcMillis) {
        return moment.utc(utcMillis).format('YYYY-MM-DD HH:mm:ss[Z]');
    };
    $scope.displaySecsInUtc = function (utcSecs) {
        return moment.utc(utcSecs * 1000).format('YYYY-MM-DD HH:mm:ss[Z]');
    };
}])

.directive('stTimeLapseControlsPanel', [
'$log',
function ($log) {
    var tag = 'stealth.timelapse.controls.stSliderControlsPane: ';
    $log.debug(tag + 'directive defined');

    return {
        restrict: 'E',
        scope: {},
        templateUrl: 'timelapse/controls/controlsPanel.tpl.html'
    };
}])

.directive('stTimeLapseSlider', [
'$log',
'$timeout',
function ($log, $timeout) {
    var tag = 'stealth.timelapse.controls.stTimeLapseSlider: ';
    $log.debug(tag + 'directive defined');

    var link = function (scope) {
        var isReady = true;

        var model = angular.copy(scope.model);
        scope.model.changed = function () {
            if (scope.model.max === undefined ||
                !angular.isNumber(scope.model.max)) {
                scope.model.max = 1;
            } else if (scope.model.max < 1) {
                scope.model.max = 1;
            }

            if (model.max !== scope.model.max && scope.model.value > scope.model.max) {
                scope.model.value = scope.model.max;
            }

            scope.model.millis = scope.model.toMillis(scope.model.value, scope.model.unit);
            model = angular.copy(scope.model);

            if (isReady) {
                isReady = false;
                $timeout(function () {
                    scope.model.notifyListeners();
                    isReady = true;
                }, 100);
            }
        };

        scope.model.changed();
    };

    function getTemplate () {
        var tpl = '<input type="range" st-int-input';
        if (bowser.chrome) {
            tpl += ' style="display:inline-block;"';
        }
        tpl += ' ng-model="model.value" \
               ng-attr-min="{{model.min}}" \
               ng-attr-max="{{model.max}}" \
               ng-attr-step="{{model.step}}" \
               ng-change="model.changed()">';

        return tpl;
    }

    return {
        restrict: 'E',
        scope: {
            model: '='
        },
        template: getTemplate(),
        link: link
    };
}])

;
