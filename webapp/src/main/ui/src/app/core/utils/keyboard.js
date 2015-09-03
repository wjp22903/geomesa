angular.module('stealth.core.utils')

.service('stealth.core.utils.keyboard', [
'$document',
function ($document) {
    var _listenCount = 0;
    var _down = [];
    var _keydownFn = function (evt) {
        if (!_.contains(_down, evt.keyCode)) {
            _down.push(evt.keyCode);
        }
    };
    var _keyupFn = function (evt) {
        _.pull(_down, evt.keyCode);
    };

    /**
     * Request that the service listen to the keyboard.
     * Service will listen if there is at least 1 active request.
     */
    this.listen = function () {
        _listenCount = Math.max(0, ++_listenCount);
        if (_listenCount === 1) {
            $document.on('keydown', _keydownFn).on('keyup', _keyupFn);
        }
    };

    /**
     * Request that the service stop listening (i.e. de-activate previous
     * listen request).  Service will continue listening if other requests are
     * still active, unless 'force' is passed.
     *
     * @param {boolean} force - If true, force the service to stop listening
     *     to keyboard
     */
    this.unlisten = function (force) {
        _listenCount = force ? 0 : Math.max(0, --_listenCount);
        if (_listenCount === 0) {
            $document.off('keydown', _keydownFn).off('keyup', _keyupFn);
            _down = [];
        }
    };

    /**
     * Checks if specified keys are currently down.
     *
     * @param {number[]} keyCodes - Checks if keys with these codes are down
     * @param {boolean} only - If true, requires that only the specified keys
     *     are down
     *
     * @returns {boolean}
     */
    this.isDown = function (keyCodes, only) {
        if (_.isArray(keyCodes) && keyCodes.length) {
            var contains = _.intersection(_down, keyCodes).length === keyCodes.length;
            return contains && (only ? _down.length === keyCodes.length : true);
        }
        return false;
    };
}])
;
