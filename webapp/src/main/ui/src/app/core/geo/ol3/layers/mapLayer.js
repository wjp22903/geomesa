angular.module('stealth.core.geo.ol3.layers', [
    'stealth.core.interaction.capabilities',
    'stealth.core.utils'
])

.factory('stealth.core.geo.ol3.layers.MapLayer', [
'$log',
'$rootScope',
'$q',
'$timeout',
'coreCapabilitiesExtender',
'stealth.core.utils.WidgetDef',
function ($log, $rootScope, $q, $timeout, coreCapabilitiesExtender, WidgetDef) {
    var tag = 'stealth.core.geo.ol3.layers.MapLayer: ';
    $log.debug(tag + 'factory started');
    var _idSeq = 0;
    /**
     * Base class for all map layers.
     * @param {string} name - Display name for layer
     * @param {ol.layer.Layer} ol3Layer - Underlying OL3 layer impl
     * @param {boolean} queryable - Can this layer respond to map queries
     * @param {number} zIndexHint - Suggestion for where layer should go in stack.
     *     Lower values suggest bottom of stack.
     *     Some values for expected categories:
     *         -20 base layers
     *         -10 context layers
     *           0 most layers (analysis, data, etc)
     *          10 overlays, drawings, etc
     *     These hints only apply when layer is added to stack.  Users can
     *     reorder as desired.  Also, once stack is reordered, the application
     *     of hints breaks down and layers may be inserted in unexpected order.
     *
     * @class
     */
    var MapLayer = function (name, ol3Layer, queryable, zIndexHint) {
        //@private
        var _self = this;

        this.id = _idSeq++;
        this.name = name;
        this.ol3Layer = ol3Layer;
        this.queryable = queryable;
        this.zIndexHint = zIndexHint || 0;
        this.reverseZIndex = -1; //Lower # means layer is higher on map. This will be set by the map.
        this.styleDirective = 'st-map-layer-style';
        this.styleDirectiveScope = null;
        this.styleDirectiveIsoScopeAttrs = null;

        if (ol3Layer) {
            var scope = $rootScope.$new();
            scope.layerState = {
                visible: ol3Layer.getVisible(),
                opacity: ol3Layer.getOpacity()
            };
            scope.toggleVisibility = function () {
                ol3Layer.setVisible(!ol3Layer.getVisible());
            };
            scope.$watch('layerState.opacity', function (newVal) {
                ol3Layer.setOpacity(newVal);
            });
            ol3Layer.set('id', this.id);
            ol3Layer.set('name', name);
            scope.ol3Layer = ol3Layer;
            scope.fragmentUrl = 'core/geo/ol3/layers/layer-fragments.tpl.html';
            scope.styleVars = {
                iconClass: 'fa fa-fw fa-lg fa-globe'
            };
            this.styleDirectiveScope = scope;

            // Update viewState on layer visibility change.
            ol3Layer.on('change:visible', function () {
                $timeout(function () {
                    scope.layerState.visible = ol3Layer.getVisible();
                });
            });

            /**
             * An object definining a search response.
             * @typedef {object} MapLayer~SearchPointResponse
             * @property {string} name - Display name
             * @property {boolean} isError
             * @property {string} [reason]
             * @property {object} capabilities
             * @property {object[]} [records] - the search results
             * @property {object} [layerFill]
             * @property {object[]} [featureTypes]
             * @property {boolean} [isFilterable]
             * @property {function} [filterHandler]
             * @property {string} [levelSuffix] - appended to level to provide sub-ordering
             *     Ex: _0001_0002
             */
            /**
             * Queries this layer at specified coordinate and resolution
             * @param {number[]} coord - [longitude, latitude]
             * @param {number} res - map resolution
             *
             * @returns {Promise}
             */
            this.searchPoint = function () {
                return $q.when(this.getEmptySearchPointResult());
            };
            /**
             * Creates a non-error search result with no records
             * @returns {MapLayer~SearchPointResponse} records property is undefined
             */
            this.getEmptySearchPointResult = function () {
                return {
                    name: this.name,
                    isError: false,
                    capabilities: this.getCapabilities()
                };
            };
            /**
             * Returns the un-extended, base capabilities set for this layer.
             * @returns {object}
             */
            this.getBaseCapabilities = function () {
                return {};
            };
            /**
             * Returns layer's capabilities extender.
             * @returns {stealth.core.interaction.capabilities.Extender}
             */
            this.getCapabilitiesExtender = function () {
                return coreCapabilitiesExtender;
            };
            /**
             * Creates an options object that is passed to the capabilities extender's
             * extendCapabilities method.
             * @returns {object}
             */
            this.getCapabilitiesOpts = function () {
                return {};
            };
            /**
             * Returns the full, extended capabilities for this layer.
             * @returns {object}
             */
            this.getCapabilities = function () {
                return this.getCapabilitiesExtender().extendCapabilities(
                    this.getBaseCapabilities(), this,
                    this.getCapabilitiesOpts());
            };
            /**
             * An object definining a result widget.
             * @typedef {object} MapLayer~SearchPointWidget
             * @property {(string|number)} level - Sorted (asc) to determine ordering
             * @property {string} iconClass - CSS classes to use for icon
             * @property {string} tooltipText - tooltip text for icon
             * @property {stealth.core.utils.WidgetDef} widgetDef - widget to display content
             */
            /**
             * Creates widgets to display layer's search results.
             * @param {number[]} coord - [longitude, latitude]
             * @param {number} res - map resolution
             * @param {Scope} [parentScope=$rootScope] - parent for widget scopes
             *
             * @returns {Promise[]} Each Promise returns a {@link MapLayer~SearchPointWidget}
             */
            this.buildSearchPointWidgets = function (coord, res, parentScope) {
                if (!(this.queryable && this.ol3Layer.getVisible())) {
                    return $q.when({isError: true});
                }
                var promises = this.searchPoint(coord, res);
                if (!_.isArray(promises)) {
                    promises = [promises];
                }
                return _.map(promises, function (promise) {
                    return promise.then(function (response) {
                        return _self.buildSearchPointWidgetsForResponse(response, parentScope);
                    });
                });
            };
            /**
             * Build the widget(s) for a search response.
             * @param {MapLayer~SearchPointResponse} response - search response
             * @param {Scope} [parentScope=$rootScope] - parent for widget scopes
             *
             * @returns {(MapLayer~SearchPointWidget|MapLayer~SearchPointWidget[])}
             */
            this.buildSearchPointWidgetsForResponse = function (response, parentScope) {
                var s = (parentScope || $rootScope).$new();
                s.results = [response];
                return {
                    level: _.padLeft(_self.reverseZIndex, 4, '0') + (response.levelSuffix || ''),
                    iconClass: _self.styleDirectiveScope.styleVars.iconClass,
                    tooltipText: response.name,
                    widgetDef: (response.isError ||
                        !_.isArray(response.records) ||
                        _.isEmpty(response.records)) ?
                            null : new WidgetDef('st-ol3-map-popup-search-result-table', s,
                                "results='results' max-col-width='125' resizable='true'")
                };
            };
        }
        $log.debug(tag + 'new MapLayer(' + name + ')');
    };

    /**
     * @returns {stealth.core.utils.WidgetDef} Layer's style widget
     * @public
     */
    MapLayer.prototype.getStyleDisplayDef = function () {
        if (!this.styleDisplayDef) {
            this.styleDisplayDef = new WidgetDef(
                this.styleDirective, this.styleDirectiveScope,
                this.styleDirectiveIsoScopeAttrs);
        }
        return this.styleDisplayDef;
    };
    /**
     * @returns {number} Layer's ID
     * @public
     */
    MapLayer.prototype.getId = function () {
        return this.id;
    };
    /**
     * @returns {ol.layer.Layer} Layer's OL3 layer
     * @public
     */
    MapLayer.prototype.getOl3Layer = function () {
        return this.ol3Layer;
    };
    /**
     * @param {string} name - New name
     * @public
     */
    MapLayer.prototype.setName = function (name) {
        this.name = name;
        this.ol3Layer.set('name', name);
    };

    return MapLayer;
}])

.directive('stMapLayerStyle', [
'$log',
function ($log) {
    $log.debug('stealth.core.geo.ol3.layers.stMapLayerStyle: directive defined');
    return {
        template: '<ui-include src="fragmentUrl" fragment="\'.layerStyleMapLayer\'"></ui-include>'
    };
}])

;
