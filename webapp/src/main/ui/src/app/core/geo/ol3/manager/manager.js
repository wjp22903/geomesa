angular.module('stealth.core.geo.ol3.manager', [
    'ui.sortable',
    'stealth.core.sidebar',
    'stealth.core.startmenu',
    'stealth.core.geo.ol3.map'
])

.run([
'$log',
'$rootScope',
'sidebarManager',
'startMenuManager',
'stealth.core.utils.WidgetDef',
function ($log, $rootScope, sidebarManager, startMenuManager, WidgetDef) {
    var panelScope = $rootScope.$new();
    panelScope.view = 'explore'; //default view
    var sidebarId = sidebarManager.addButton('Map Manager', 'fa-globe', 400,
        new WidgetDef('st-ol3-manager', panelScope, "view='view'"),
        new WidgetDef('st-ol3-manager-view-switcher', panelScope, "view='view'"),
        true);
    startMenuManager.addButton('Map Manager', 'fa-globe', function () {
        sidebarManager.toggleButton(sidebarId, true);
    });
}])

.directive('stOl3ManagerViewSwitcher', [
'$log',
function ($log) {
    $log.debug('stealth.core.geo.ol3.manager.stOl3ManagerViewSwitcher: directive defined');
    return {
        restrict: 'E',
        replace: true,
        scope:{
            view: "="
        },
        template: '<div class="btn-group ol3ManagerViewSwitcher">\
                       <label class="btn btn-default" ng-model="view" btn-radio="\'explore\'">Explore</label>\
                       <label class="btn btn-default" ng-model="view" btn-radio="\'style\'">Style</label>\
                   </div>'
    };
}])

.directive('stOl3Manager', [
'$log',
'ol3Map',
'categoryManager',
function ($log, ol3Map, catMgr) {
    $log.debug('stealth.core.geo.ol3.manager.stOl3Manager: directive defined');
    return {
        restrict: 'E',
        replace: true,
        scope: {
            view: "="
        },
        templateUrl: 'core/geo/ol3/manager/manager.tpl.html',
        controller: ['$scope', function ($scope) {
            $scope.map = ol3Map;
            $scope.catMgr = catMgr;
            $scope.layers = ol3Map.getLayersReversed();
            $scope.sortableOptions = {
                handle: '.dragHandle',
                stop: function (evt, ui) {
                    var sortable = ui.item.sortable;
                    if (sortable && _.isNumber(sortable.dropindex) &&
                            _.isNumber(sortable.index) &&
                            sortable.index != sortable.dropindex) {
                        var lastIndex = $scope.layers.length - 1;
                        ol3Map.moveOl3Layer(lastIndex - sortable.index,
                                            lastIndex - sortable.dropindex);
                    }
                }
            };
        }]
    };
}])

.directive('stCategoryResizable',
function () {
    return {
        restrict: 'A',
        scope: {
            category: '='
        },
        link: function (scope, element) {
            element.children().css('max-height', (scope.category.height || 250) + 'px');
            element.resizable({
                handles: 's',
                start: function (event, ui) {
                    element.css('max-height', '');
                    element.children().css('max-height', '');
                },
                stop: function (event, ui) {
                    scope.$evalAsync(function () {
                        scope.category.height = ui.size.height;
                    });
                }
            });
        }
    };
})

.service('categoryManager', [
function () {
    //2D array of categories
    var _categories = [];
    this.addCategory = function (level, category) {
        if (_.isArray(_categories[level])) {
            var index = _.sortedIndex(_categories[level],
                {order: category.order + 1}, //+1 to find end of group
                'order');
            _categories[level].splice(index, 0, category);
        } else {
            _categories[level] = [category];
        }
    };
    this.removeCategory = function (id) {
        _.each(_categories, function (level) {
            _.remove(level, function (c) {
                return c.id === id;
            });
        });
    };
    this.getLevels = function () {
        return _.range(_categories.length);
    };
    this.getLevel = function (level) {
        return _categories[level];
    };
    this.getCategories = function () {
        return _.flatten(_categories, true);
    };
}])

.factory('stealth.core.geo.ol3.manager.Category', [
function () {
    var _idSeq = 0;
    var Category = function (order, title, iconClass, contentDef, toolDef, toggledOn) {
        this.id = _idSeq++;
        this.order = order;
        this.iconClass = iconClass;
        this.title = title;
        this.contentDef = contentDef;
        this.toolDef = toolDef;
        this.toggledOn = toggledOn;
    };
    return Category;
}])
;
