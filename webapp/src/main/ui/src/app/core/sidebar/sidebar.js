angular.module('stealth.core.sidebar', [
])

.service('sidebarManager', [
'$log',
function ($log) {
    $log.debug('stealth.core.sidebar.sidebarManager: service started');
    var _sidebarWidth = 36;
    var _idSeq = 0;
    var _buttons = [];
    var _openPanelIds = [];
    var _hideAll = false;
    var _sidebarText;

    function _setLefts () {
        var lefts = _sidebarWidth; //sidebar width
        _.each(_openPanelIds, function (openPanelId) {
            var button = _.find(_buttons, {id: openPanelId});
            if (button) {
                button.panel.style.left = lefts + 'px';
                lefts += parseInt(button.panel.style.width.slice(0, -2), 10);
            }
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
            contentDef, toolDef, permanent, onClose) {
        var _id = _idSeq++;
        _buttons.push({
            id: _id,
            iconClass: iconClass,
            permanent: permanent,
            onClose: onClose,
            panel: {
                title: title,
                style: {
                    width: width + 'px'
                },
                open: false,
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
        var matches = _.remove(_buttons, {id: id});
        if (!_.isEmpty(matches)) {
            _.each(matches, function (b) {
                if (_.isFunction(b.onClose)) {
                    b.onClose();
                }
            });
            _.pull(_openPanelIds, id);
            _setLefts();
        }
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
        var theButton = _.find(_buttons, {id: id});
        if (theButton) {
            if (openValue !== theButton.panel.open) {
                theButton.panel.pinned = false;
                if (theButton.panel.open) {
                    delete theButton.panel.style.left;
                    _.pull(_openPanelIds, theButton.id);
                } else {
                    _.each(_buttons, function (button) {
                        if (button.id !== id && !button.panel.pinned) {
                            button.panel.open = false;
                            delete button.panel.style.left;
                            _.pull(_openPanelIds, button.id);
                        }
                    });
                    _openPanelIds.push(id);
                }
                _setLefts();
                theButton.panel.open = openValue;
            }
        }
        return id;
    };
    /**
     * Getters and setters
     */
    this.getHideAll = function () { return _hideAll; };
    this.setHideAll = function (hideAll) { _hideAll = hideAll; };
    this.getSidebarText = function () { return _sidebarText; };
    this.setSidebarText = function (text) { _sidebarText = text; };
}])

.directive('stSidebar', [
'$log',
'sidebarManager',
function ($log, manager) {
    $log.debug('stealth.core.sidebar.stSidebar: directive defined');
    return {
        restrict: 'E',
        replace: true,
        scope: {},
        templateUrl: 'core/sidebar/sidebar.tpl.html',
        controller: ['$scope', function ($scope) {
            $scope.manager = manager;
        }]
    };
}])
;
