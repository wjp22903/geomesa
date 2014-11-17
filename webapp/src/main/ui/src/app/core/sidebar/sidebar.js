angular.module('stealth.core.sidebar', [
    'ngAnimate',
    'ui.bootstrap',
    'stealth.core.utils'
])

.service('sidebarManager', [
'$rootScope',
function ($rootScope) {
    var _sidebarWidth = 36;
    var _idSeq = 0;
    var _buttons = [];
    var _openPanelIds = [];

    function _setLefts() {
        var lefts = _sidebarWidth; //sidebar width
        _.each(_openPanelIds, function (openPanelId) {
            _.each(_buttons, function (button) {
                if (button.id === openPanelId && button.panel.style.left) {
                    button.panel.style.left = lefts + 'px';
                    lefts += parseInt(button.panel.style.width.slice(0, -2), 10);
                }
            });
        });
    }

    // ***** API *****
    /**
     * Returns array of buttons currently managed by sidebar.
     */
    this.getButtons = function () {
        return _buttons;
    };
    /**
     * Adds a button to the sidebar.
     */
    this.addButton = function (title, iconClass, width,
            contentDef, toolDef, permanent) {
        var _id = _idSeq++;
        _buttons.push({
            id: _id,
            iconClass: iconClass,
            permanent: permanent,
            panel: {
                title: title,
                style: {
                    width: width + 'px'
                },
                contentDef: contentDef,
                toolDef: toolDef
            }
        });
        return _id;
    };
    /**
     * Removes a button from sidebar.
     */
    this.removeButton = function (id) {
        _.remove(_buttons, {id: id});
        _.pull(_openPanelIds, id);
        _setLefts();
    };
    /**
     * Toggles the open state of a button/panel.
     *
     * This function sets the button's open value to openValue.
     * It's up to the caller to decide if value should be changed from current.
     * It's possible that we don't want to change the value because it'll be
     * handled somewhere else....for example, by an ng-model.
     */
    this.toggleButton = function (id, openValue) {
        var _theButton;
        var _closing;
        var _left = _sidebarWidth;
        _.each(_buttons, function (button) {
            if (button.id === id) {
                _theButton = button;
                _closing = button.panel.open;
            } else {
                if (button.panel.pinned) {
                    _left += parseInt(button.panel.style.width.slice(0, -2), 10);
                }
            }
        });
        if (_theButton) {
            _theButton.panel.pinned = false;
            if (_closing) {
                delete _theButton.panel.style.left;
                _.pull(_openPanelIds, _theButton.id);
                _setLefts();
            } else {
                _theButton.panel.style.left = _left + 'px';
                _.each(_buttons, function (button) {
                    if (button.id !== id && !button.panel.pinned) {
                        button.panel.open = false;
                        delete button.panel.style.left;
                        _.pull(_openPanelIds, button.id);
                    }
                });
                _openPanelIds.push(id);
            }
            _theButton.panel.open = openValue;
        }
    };
}])

.directive('stSidebar', [
'sidebarManager',
function (manager) {
    return {
        restrict: 'E',
        replace: true,
        templateUrl: 'core/sidebar/sidebar.tpl.html',
        controller: ['$scope', function ($scope) {
            $scope.manager = manager;
        }]
    };
}])
;
