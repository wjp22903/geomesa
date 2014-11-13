angular.module('stealth.common.control.playbackControl', [
    'stealth.common.filters',
    'stealth.common.map.leaflet.canvas'
])

.factory('PlaybackControlFactory', [
    '$compile', '$templateCache', '$rootScope',
    function ($compile, $templateCache, $rootScope) {

        var PlaybackControl = L.Control.extend({
            options: {
                position: 'bottomright'
            },

            onAdd: function (map) {
                this._initLayout(map);
                return this._container;
            },

            onRemove: function (map) {
            },

            _initLayout: function (map) {
                this._container = L.DomUtil.create('div', 'playback-control-layers-extended leaflet-control-layers');
                var ngContainer = angular.element(this._container);
                ngContainer.attr('aria-haspopup', 'true');
                var sliderElement = angular.element($templateCache.get('common/control/playbackControl.tpl.html'));
                ngContainer.append($compile(sliderElement)($rootScope.$new()));

                // Disable map dragging when the mouse is over the slider.
                $(ngContainer).mouseover(function() {
                    map.dragging.disable();
                    map.doubleClickZoom.disable();
                });
                $(ngContainer).mouseout(function() {
                    map.dragging.enable();
                    map.doubleClickZoom.enable();
                });
            }
        });

        var _createControl = function (options) {
            return new PlaybackControl(options);
        };

        return {
            createControl: _createControl
        };
    }
])

.service('PlaybackManager', [
    '$interval', '$rootScope', 'CanvasDrawingService',
    function($interval, $rootScope, CanvasDrawingService) {

        // Public Members
        var self = this,
            isPlaying = false,
            playPromise,
            fpsPromise;

        // Private Members
        this.Playback = {
            minTimestamp: undefined,
            maxTimestamp: undefined,
            curTimestamp: 0,
            playbackRate: 0,
            redrawInterval: 20, // milliseconds
            nRedraws: 0
        };
        this.Follow = {
            minFollowMin: 1,
            maxFollowMin: 240,
            curFollowMin: 10,
            followStep: 1
        };
        this.Step = {
            minStepSec: 1,
            maxStepSec: 600,
            curStepSec: 30,
            stepStep: 1
        };
        this.Display = {
            isVisible: false,
            isPaused: true,
            isPlaying: false
        };

        // Private Methods
        // Slider values are Strings for some reason, so we have to parse them
        // back to ints whenever they get updated.
        function _parseSliders () {
            self.Playback.curTimestamp = parseInt(self.Playback.curTimestamp, 10);
            self.Follow.curFollowMin = parseInt(self.Follow.curFollowMin, 10);
            self.Step.curStepSec = parseInt(self.Step.curStepSec, 10);
        }

        function _play (update) {
            playPromise = $interval(function() {
                var updatedTime = self.Playback.curTimestamp + self.Step.curStepSec*1000;
                if (updatedTime > self.Playback.maxTimestamp) {
                    self.Playback.curTimestamp = self.Playback.minTimestamp;
                } else {
                    self.Playback.curTimestamp = updatedTime;
                }
                self.updatePlaybackState(true);
            }, self.Playback.redrawInterval);
            isPlaying = true;
            if (update) {
                self.Display.isPlaying = true;
                self.Display.isPaused = false;
                if (fpsPromise !== undefined) {
                    $interval.cancel(fpsPromise);
                }
                _calcFps();
            }
        }

        function _calcFps () {
            fpsPromise = $interval(function () {
                var nRedraws = self.Playback.nRedraws;
                self.Playback.playbackRate = nRedraws; // Number of redraws per second.
                self.Playback.nRedraws = 0;
            }, 1000);
        }

        function _pause (update) {
            if (playPromise !== undefined) {
                $interval.cancel(playPromise);
            }
            isPlaying = false;
            if (update) {
                self.Display.isPlaying = false;
                self.Display.isPaused = true;
            }
        }

        // Public methods
        this.togglePlay = function () {
            if (isPlaying) {
                _pause(true);
            } else {
                _play(true);
            }
        };

        this.updatePlaybackState = function (useForFpsCalc) {
            _parseSliders();
            CanvasDrawingService.redraw(this.Playback.curTimestamp, this.Follow.curFollowMin);

            if (useForFpsCalc) {
              this.Playback.nRedraws += 1;
            }
        };

        // Subscribe
        $rootScope.$on('New Playback Layer', function(event, minTimestamp, maxTimestamp) {
            if (!self.Display.isVisible) {
                self.Playback.minTimestamp = (((minTimestamp / 60000)|0) - 1) * 60000;
                self.Playback.maxTimestamp = (((maxTimestamp / 60000)|0) + 1) * 60000;
                self.Playback.curTimestamp = self.Playback.minTimestamp;
                _play(true);
                self.Display.isVisible = true;
            } else {
                if (minTimestamp < self.Playback.minTimestamp) {
                    self.Playback.minTimestamp = (((minTimestamp / 60000)|0) - 1) * 60000;
                }
                if (maxTimestamp > self.Playback.maxTimestamp) {
                    self.Playback.maxTimestamp = (((maxTimestamp / 60000)|0) + 1) * 60000;
                }
            }
        });

        $rootScope.$on('Reset Playback Time', function(event, minTimestamp, maxTimestamp) {
            self.Playback.minTimestamp = minTimestamp;
            self.Playback.maxTimestamp = maxTimestamp;
            if (self.Playback.curTimestamp < self.Playback.minTimestamp) {
                self.Playback.curTimestamp = self.Playback.minTimestamp;
            }
            if (self.Playback.curTimestamp > self.Playback.maxTimestamp) {
                self.Playback.curTimestamp = self.Playback.maxTimestamp;
            }
            self.updatePlaybackState(false);
        });

        $rootScope.$on('Close Playback', function(event) {
            self.Display.isVisible = false;
            _pause(true);
        });
    }
])

.controller('PlaybackControlController', [
    '$scope', 'PlaybackManager',
    function($scope, PlaybackManager) {
        $scope.playback = PlaybackManager.Playback;
        $scope.follow = PlaybackManager.Follow;
        $scope.step = PlaybackManager.Step;
        $scope.display = PlaybackManager.Display;

        // Playback control passthrough methods.
        $scope.togglePlay = function () {
            PlaybackManager.togglePlay();
        };

        $scope.updatePlaybackState = function () {
            PlaybackManager.updatePlaybackState();
        };

        $scope.displayInUtc = function (utcMillis) {
            return moment.utc(utcMillis).format('YYYY-MM-DD HH:mm:ss');
        };
    }
]);
