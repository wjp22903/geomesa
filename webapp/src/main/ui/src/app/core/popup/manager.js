angular.module('stealth.core.popup')

.service('stealth.core.popup.popupManager', [
'$log',
'$rootScope',
function ($log, $rootScope) {
    var _self = this;
    var _hideAll = false;
    var _idSeq = 0;
    var _primaryDisplay = angular.element('.primaryDisplay');
    var _popups = [];
    var _tag = 'stealth.core.popup.popupManager: ';
    $log.debug(_tag + 'service started');

    /**
     * Sets extra button classes.
     * @callback extraClasses
     * @returns {Object} - Keys representing class names to enable if the linked value is true.
     */

    /**
     * The onclick callback function to execute for a button.
     * @callback onClick
     */

    /**
     * Defines a button for use in the popup header.
     * @typedef {Object} PopupButton
     * @property {string} iconClass - The name of the font-awesome icon to use for this button.
     * @property {extraClasses} extraClasses - Function passed to ngClass to define extra button classes.
     * @property {onClick} onClick - Function passed to ngClick to define a button's action.
     */

    /**
     * Called when the popup is closed.
     * @callback onClose
     */

    /**
     * Creates and displays a new popup in the primary display.
     *
     * @param {string} title - What to display in the header for the new popup.
     * @param {string} iconClass - The name of the font-awesome icon to use in the header.
     * @param {stealth.core.utils.WidgetDef} contentDef - The widget definition to render in the popup body.
     * @param {Object} [options] - Extra properties for customizing the popup.
     * @param {number} [options.offsetX=0] - The number of pixels from the left side of the display to place the base corner of the popup.
     * @param {number} [options.offsetY=0] - The number of pixels from the top of the display to place the base corner of the popup.
     * @param {string} [options.positioning='top-left'] - One of 'bottom-left', 'top-right' or 'bottom-right'. Sets the base corner of the popup.
     * @param {PopupButton[]} [options.buttons] - An array of extra buttons to add to the header of the popup.
     * @param {Object} [options.extraStyles] - A map of valid CSS settings and values to apply to the popup container.
     * @param {boolean} [options.draggable=true] - True if the popup should be draggable within the display.
     * @param {onClose} [options.onClose] - A callback to execute when the popup is closed.
     */
    this.displayPopup = function (title, iconClass, contentDef, options) {
        var _id = _idSeq++;
        var _options = options || {};
        var _offsetX = _options.offsetX || 0;
        var _offsetY = _options.offsetY || 0;
        var _buttons = [{
            iconClass: 'text-danger fa-remove',
            onClick: function () {
                _self.closePopup(_id);
            }
        }];
        var _extraStyles = {
            position: 'absolute'
        };

        if (_.isArray(_options.buttons)) {
            Array.prototype.unshift.apply(_buttons, _options.buttons);
        }

        switch (_options.positioning) {
            case 'bottom-left':
                _extraStyles.left = _offsetX + 'px';
                _extraStyles.bottom = (_primaryDisplay.height() - _offsetY) + 'px';
                break;
            case 'top-right':
                _extraStyles.right = (_primaryDisplay.width() - _offsetX) + 'px';
                _extraStyles.top = _offsetY + 'px';
                break;
            case 'bottom-right':
                _extraStyles.right = (_primaryDisplay.width() - _offsetX) + 'px';
                _extraStyles.bottom = (_primaryDisplay.height() - _offsetY) + 'px';
                break;
            default:
                _extraStyles.left = _offsetX + 'px';
                _extraStyles.top = _offsetY + 'px';
        }
        if (_.isObject(_options.extraStyles)) {
            _.merge(_extraStyles, _options.extraStyles);
        }

        _popups.push({
            id: _id,
            title: title,
            iconClass: iconClass,
            contentDef: contentDef,
            draggable: _.isUndefined(_options.draggable) ? true : !!_options.draggable,
            extraStyles: _extraStyles,
            buttons: _buttons,
            onClose: _.isFunction(_options.onClose) ? _options.onClose : _.noop
        });

        return _id;
    };

    this.focusPopup = function (popupId) {
        Array.prototype.push.apply(_popups, _.remove(_popups, {id: popupId}));
    };

    this.closePopup = function (id) {
        _(_popups).remove({id: id}).forEach(function (popup) {
            popup.onClose();
            popup.contentDef.getScope().$destroy();
        }).run();
    };

    this.getPopups = function () {
        return _popups;
    };

    this.getHideAll = function () {
        return _hideAll;
    };

    $rootScope.$on('wizard:launchWizard', function () {
        _hideAll = true;
    });

    $rootScope.$on('wizard:closeWizard', function () {
        _hideAll = false;
    });
}])

.directive('stPopup', [
'$log',
'$timeout',
function ($log, $timeout) {
    $log.debug('stealth.core.popup.stPopup: directive defined');
    return {
        restrict: 'A',
        link: function (scope, element) {
            var primaryDisplay = angular.element('.primaryDisplay');
            scope.headerDragStart = _.noop;
            scope.headerDragEnd = _.noop;
            if (scope.popup.draggable) {
                var header = element.children('.popupHeader');
                scope.headerDragStart = function () {
                    header.css('cursor', 'move');
                };
                scope.headerDragEnd = function () {
                    header.css('cursor', 'auto');
                };
                element.draggable({
                    containment: '.primaryDisplay',
                    stop: function () {
                        scope.$applyAsync(function () {
                            element.css('width', '');
                        });
                    }
                });
                scope.$on('$destroy', function () {
                    element.draggable('destroy');
                });
            }
            $timeout(function () {
                element.removeClass('ng-hide');
                if (element.css('right') !== 'auto') {
                    var right = parseInt(element.css('right').replace(/px/, ''), 10);
                    var width = element.width();
                    var displayWidth = primaryDisplay.width();
                    element.css('left', (displayWidth - (right + width)) + 'px');
                    element.css('right', '');
                }
                if (element.css('bottom') !== 'auto') {
                    var bottom = parseInt(element.css('bottom').replace(/px/, ''), 10);
                    var height = element.height();
                    var displayHeight = primaryDisplay.height();
                    element.css('top', (displayHeight - (bottom + height)) + 'px');
                    element.css('bottom', '');
                }
            });
        }
    };
}])

.directive('stPopupContainer', [
'$log',
'stealth.core.popup.popupManager',
function ($log, manager) {
    $log.debug('stealth.core.popup.stPopupContainer: directive defined');
    return {
        restrict: 'E',
        scope: {},
        templateUrl: 'core/popup/popup.tpl.html',
        controller: ['$scope', function ($scope) {
            $scope.manager = manager;
        }]
    };
}])
;
