angular.module('stealth.timelapse.controls', [
])

.controller('timeLapseControlsController', [
'$log',
'$rootScope',
'$scope',
'$interval',
'$timeout',
function ($log, $rootScope, $scope, $interval, $timeout) {
    var tag = 'stealth.timelapse.controls.timeLapseControlsController: ';
    $log.debug(tag + 'controller started');

    var toMillis = function (val, unit) {
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
    };

    var playing = null;

    $scope.display = {
        isPlaying: false,
        isPaused: true
    };
    $scope.display.togglePlay = function () {
        var isPlaying = $scope.display.isPlaying = !$scope.display.isPlaying;
        $scope.display.isPaused = !$scope.display.isPaused;

        if (isPlaying) {
            playing = $interval(function () {
                var valInSecs = $scope.dtg.value;
                var stepInSecs = toMillis($scope.step.value, $scope.step.unit) / 1000;
                var t = Math.ceil(valInSecs + stepInSecs); // seconds
                if (t < $scope.dtg.min) {
                    $scope.dtg.value = $scope.dtg.min;
                } else if (t > $scope.dtg.max) {
                    $scope.dtg.value = $scope.dtg.min;
                } else {
                    $scope.dtg.value = t;
                }
                $scope.dtg.millis = toMillis($scope.dtg.value, $scope.dtg.unit);
                $rootScope.$emit('timelapse:dtgChanged', $scope.dtg.millis);
            }, 16 /* milliseconds */);
        } else {
            if (playing) {
                $interval.cancel(playing);
            }
        }
    };

    $scope.units = ['s', 'm', 'h', 'd'];
    $scope.displayInUtc = function (utcMillis) {
            return moment.utc(utcMillis).format('YYYY-MM-DD HH:mm:ss');
    };

    var thisMoment = moment();
    var aMonthAgo = angular.copy(thisMoment);
    aMonthAgo.subtract(1, 'months');
    var nowInSecs = thisMoment.format("x") / 1000 | 0;
    var beforeInSecs = aMonthAgo.format("x") / 1000 | 0;
    $scope.dtg = {
        value: beforeInSecs,
        min: beforeInSecs,
        max: nowInSecs,
        unit: $scope.units[0], // seconds
        toMillis: toMillis
    };
    $scope.dtg.millis = $scope.dtg.value * 1000; // convert from seconds

    $scope.window = {
        value: 10,
        min: 0,
        max: 120,
        unit: $scope.units[1], // minutes
        toMillis: toMillis
    };
    $scope.window.millis = $scope.window.value * 60000; // convert from minutes

    $scope.step = {
        value: 30,
        min: 0,
        max: 300,
        unit: $scope.units[0], // seconds
        toMillis: toMillis
    };
    $scope.step.millis = $scope.step.value * 1000; // convert from seconds

    $rootScope.$on('timelapse:setDtgBounds', function (event, data) {
        $scope.dtg.min = data.minInSecs;
        $scope.dtg.max = data.maxInSecs;

        if ($scope.dtg.value < $scope.dtg.min) {
            $scope.dtg.value = $scope.dtg.min;
        }

        if ($scope.dtg.value > $scope.dtg.max) {
            $scope.dtg.value = $scope.dtg.max;
        }

        // This block needed to sync the stTimeLapseSlider's
        // internal copy of the dtg model which was instantiated
        // during bootstrap.
        var value = angular.copy($scope.dtg.value); // Save value needed.
        $scope.dtg.changed();  // Update internal copy (This also scales $scope.dtg.value).
        $scope.dtg.value = value; // Set value back to what it needs to be.
        $scope.dtg.millis = toMillis($scope.dtg.value, $scope.dtg.unit); // Calc millis.

        // Apply changes.
        $timeout(function () {
            $scope.$apply();
        });

        // Notify listeners that dtg value changed.
        // (If redraw listeners are registered, this should trigger a redraw as well.)
        $scope.$emit('timelapse:dtgChanged', $scope.dtg.millis);
    });

    $rootScope.$on('timelapse:resetDtgBounds', function () {
        var thisMoment = moment();
        var aMonthAgo = angular.copy(thisMoment);
        aMonthAgo.subtract(1, 'months');
        var nowInSecs = thisMoment.format("x") / 1000 | 0;
        var beforeInSecs = aMonthAgo.format("x") / 1000 | 0;

        $scope.dtg.value = beforeInSecs;
        $scope.dtg.min = beforeInSecs;
        $scope.dtg.max = nowInSecs;
        $scope.dtg.millis = toMillis($scope.dtg.value, $scope.dtg.unit);
        $scope.$emit('timelapse:dtgChanged', $scope.dtg.millis);
        if ($scope.display.isPlaying) {
            $scope.display.togglePlay();
        }
    });
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
'$rootScope',
function ($log, $rootScope) {
    var tag = 'stealth.timelapse.controls.stTimeLapseSlider: ';
    $log.debug(tag + 'directive defined');

    var link = function (scope, el, attrs, controller) {

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

            scope.model.millis = Math.ceil(scope.model.toMillis(scope.model.value, scope.model.unit));
            model = angular.copy(scope.model);

            $rootScope.$emit(attrs.emit, scope.model.millis);
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
               step="0.02" \
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
