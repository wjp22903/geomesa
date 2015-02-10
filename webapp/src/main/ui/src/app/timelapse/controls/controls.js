angular.module('stealth.timelapse.controls', [
])

.service('tlControlsManager', [
'$log',
'$interval',
'$timeout',
'$rootScope',
function ($log, $interval, $timeout, $rootScope) {
    var tag = 'stealth.timelapse.controls.tlControlsManager: ';
    $log.debug(tag + 'service started');

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

    var units = ['s', 'm', 'h', 'd'];

    var dtgListeners = [];
    var windowListeners = [];
    var stepListeners = [];

    function notifyListeners (listeners, millis) {
        _.each(listeners, function (listener) {
            listener(millis);
        });
    }

    function registerListener (listeners, listener) {
        listeners.push(listener);
    }

    function unregisterListener (listeners, listener) {
        _.pull(listeners, listener);
    }

    var epoch = moment(0);
    var aMonthAfterEpoch = angular.copy(epoch);
    aMonthAfterEpoch.add(1, 'months');
    var epochInSecs = epoch.format('x') / 1000 | 0;
    var afterInSecs = aMonthAfterEpoch.format('x') / 1000 | 0;
    var dtg = {
        value: epochInSecs,
        min: epochInSecs,
        max: afterInSecs,
        unit: units[0], // seconds
        toMillis: toMillis
    };
    dtg.step = 1;
    dtg.millis = dtg.value * 1000; // convert from seconds
    dtg.notifyListeners = function (millis) {
        notifyListeners(dtgListeners, millis);
    };

    var window = {
        value: 10,
        min: 0,
        max: 120,
        unit: units[1], // minutes
        toMillis: toMillis
    };
    window.step = 1;
    window.millis = window.value * 60000; // convert from minutes
    window.notifyListeners = function (millis) {
        notifyListeners(windowListeners, millis);
    };

    var step = {
        value: 30,
        min: 0,
        max: 300,
        unit: units[0], // seconds
        toMillis: toMillis
    };
    step.step = 1;
    step.millis = step.value * 1000; // convert from seconds
    step.notifyListeners = function (millis) {
        notifyListeners(stepListeners, millis);
    };

    var display = {
        toggledOn: false,
        isPlaying: false,
        isPaused: true,
        frameIntervalMillis: 16
    };

    var playing = null;
    display.togglePlay = function () {
        display.isPlaying = !display.isPlaying;
        display.isPaused = !display.isPaused;

        if (display.isPlaying) {
            playing = $interval(function () {
                var valInSecs = Math.ceil(dtg.value);
                var stepInSecs = Math.ceil(toMillis(step.value, step.unit) / 1000);
                var t = valInSecs + stepInSecs;
                if (t < dtg.min) {
                    dtg.value = dtg.min;
                } else if (t > dtg.max) {
                    dtg.value = dtg.min;
                } else {
                    dtg.value = t;
                }
                dtg.millis = toMillis(dtg.value, dtg.unit);
                dtg.notifyListeners(dtg.millis);
            }, display.frameIntervalMillis);
        } else {
            if (playing) {
                $interval.cancel(playing);
                playing = null;
            }
        }
    };

    display.windowBeginMillis = function () {
        var dtgMinMillis = toMillis(dtg.min, dtg.unit);
        return (dtg.millis - dtgMinMillis < window.millis) ?
               dtgMinMillis : dtg.millis - window.millis;
    };

    // Responses to events emitted by BinStores.
    display.wasDisplayed = false;
    $rootScope.$on('timelapse:setDtgBounds', function (event, data) {
        $log.debug(tag + 'received "timelapse:setDtgBounds" message');

        if (!display.toggledOn) {
            display.toggledOn = true;
            display.wasDisplayed = true;
        }

        dtg.min = data.minInSecs;
        dtg.max = data.maxInSecs;

        if (dtg.value < dtg.min) {
            dtg.value = dtg.min;
        }

        if (dtg.value > dtg.max) {
            dtg.value = dtg.max;
        }

        // This block needed to sync the stTimeLapseSlider's
        // internal copy of the dtg model which was instantiated
        // during bootstrap.
        // The goal is to move the dtg slider knob to the appropriate
        // location on the slider when the slider bounds change.
        var value = angular.copy(dtg.value); // Save value needed.
        dtg.changed();  // Update internal copy (This scales dtg.value).
        dtg.value = value; // Set value back to what it needs to be.
        dtg.millis = toMillis(dtg.value, dtg.unit); // Calc millis.
        // Work-around to get slider knob to move to correct location when paused:
        // step back one step, then play forward one step.
        var valInSecs = Math.ceil(dtg.value);
        var stepInSecs = Math.ceil(toMillis(step.value, step.unit) / 1000);
        dtg.value = valInSecs - stepInSecs; // Step back.
        if (display.isPaused) { // Play forward one step.
            display.togglePlay();
            $timeout(function () {
                display.togglePlay();
            }, display.frameIntervalMillis);
        }

        // Notify listeners that dtg value changed.
        // (If redraw listeners are registered, this should trigger a redraw as well.)
        dtg.notifyListeners(dtg.millis);
    });

    $rootScope.$on('timelapse:resetDtgBounds', function () {
        display.toggledOn = false;
        display.wasDisplayed = false;

        dtg.value = epochInSecs;
        dtg.min = epochInSecs;
        dtg.max = afterInSecs;
        dtg.millis = toMillis(dtg.value, dtg.unit);
        dtg.notifyListeners(dtg.millis);
        if (display.isPlaying) {
            display.togglePlay();
        }
    });

    $rootScope.$on('wizard:launchWizard', function () {
        if (display.wasDisplayed) {
            display.toggledOn = false;
        }
        if (display.isPlaying) {
            display.togglePlay();
        }
    });

    $rootScope.$on('wizard:closeWizard', function () {
        if (display.wasDisplayed) {
            display.toggledOn = true;
        }
    });

    // ***** API *****

    this.units = units;
    this.dtg = dtg;
    this.window = window;
    this.step = step;
    this.display = display;

    this.registerDtgListener = function (listener) {
        registerListener(dtgListeners, listener);
    };
    this.unregisterDtgListener = function (listener) {
        unregisterListener(dtgListeners, listener);
    };

    this.registerWindowListener = function (listener) {
        registerListener(windowListeners, listener);
    };
    this.unregisterWindowListener = function (listener) {
        unregisterListener(windowListeners, listener);
    };

    this.registerStepListener = function (listener) {
        registerListener(stepListeners, listener);
    };
    this.unregisterStepListener = function (listener) {
        unregisterListener(stepListeners, listener);
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

    $scope.displayInUtc = function (utcMillis) {
            return moment.utc(utcMillis).format('YYYY-MM-DD HH:mm:ss[Z]');
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

    var link = function (scope, el, attrs, controller) {

        var isReady = true;

        var model = angular.copy(scope.model);
        scope.model.changed = function () {
            if (scope.model.max === undefined ||
                !angular.isNumber(scope.model.max))
            {
                scope.model.max = 1;
            } else if (scope.model.max < 2) {
                scope.model.max = 1;
            }

            if (model.max < scope.model.max || model.max > scope.model.max) {
                scope.model.value = model.value * (scope.model.max - scope.model.min) / (model.max - model.min);
            }

            scope.model.millis = scope.model.toMillis(scope.model.value, scope.model.unit);
            model = angular.copy(scope.model);

            if (isReady) {
                isReady = false;
                $timeout(function () {
                    scope.model.notifyListeners(scope.model.millis);
                    isReady = true;
                }, 100);
            }

        };

        scope.model.changed();
    };

    function getTemplate () {
      var tpl = '<input type="range" st-float-slider';
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
