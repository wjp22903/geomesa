angular.module('stealth.common.sidebar.sidebar', [
])

.service('sidebarManager', [
function () {
    var _sidebarWidth = 36;
    var _idSeq = 0;
    var _buttons = [];
    var _openPanelIds = [];

    function _setLefts() {
        var _lefts = _sidebarWidth; //sidebar width
        _.each(_openPanelIds, function (openPanelId) {
            _.each(_buttons, function (button) {
                if (button.id === openPanelId && button.panel.style.left) {
                    button.panel.style.left = _lefts + 'px';
                    _lefts += parseInt(button.panel.style.width.slice(0, -2), 10);
                }
            });
        });
    }

    this.getButtons = function () {
        return _buttons;
    };
    this.addButton = function (title, iconClass, width, permanent) {
        var _id = _idSeq++;
        _buttons.push({
            id: _id,
            iconClass: iconClass,
            permanent: permanent,
            panel: {
                title: title,
                style: {
                    width: width + 'px'
                }
            }
        });
        return _id;
    };
    this.removeButton = function (id) {
        _.remove(_buttons, {id: id});
        _.pull(_openPanelIds, id);
        _setLefts();
    };
    /**
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

.directive('sidebar', [
'sidebarManager',
function (manager) {
    return {
        restrict: 'E',
        replace: true,
        templateUrl: 'common/sidebar/sidebar.tpl.html',
        controller: function ($scope) {
            $scope.manager = manager;
            $scope.$watch('manager.getButtons()', function () {
                $scope.buttons = manager.getButtons();
            });
        }
    };
}])
;
