angular.module('stealth.dragonfish.geo.ol3.layers')

.constant('stealth.dragonfish.geo.ol3.layers.EntityConstant', {
    removeEvent: 'dragonfish.layer.entity.remove'
})

.run([
'$rootScope',
'categoryManager',
'ol3Map',
'stealth.dragonfish.geo.ol3.layers.EntityConstant',
function ($rootScope, catMgr, ol3Map, EL) {
    // handle the remove event behavior here, for when the layer is removed via the `style` view
    $rootScope.$on(EL.removeEvent, function (evt, state) { // eslint-disable-line no-unused-vars
        ol3Map.removeLayerById(state.layerId);
        catMgr.removeCategory(state.categoryId);
    });
}])

.service('stealth.dragonfish.geo.ol3.layers.styler', [
'colors',
function (colors) {
    var _styleCache = {};
    var _self = this;
    var _defaultStyle = new ol.style.Style({
        fill: new ol.style.Fill({
            color: [250, 250, 250, 1]
        }),
        stroke: new ol.style.Stroke({
            color: [220, 220, 220, 1],
            width: 1
        })
    });
    var _hidden = {display: 'none'};
    var _pinkC = colors.hexStringToRgbArray('#ffa07a');
    var _redC  = colors.hexStringToRgbArray('#ff0000');
    this.getColorByScore = function (score, cutoff) {
        var color;
        if (score < cutoff) {
            color = {display: 'none'};
        } else {
            var styleSplit = cutoff + (Math.abs(1.0 - cutoff) / 2);
            color = {color: score >= styleSplit ? '#ff0000' : '#ffa07a'};
        }
        return color;
    };
    this.curryableStyleFunction = function (viewState, feature, resolution) { //eslint-disable-line no-unused-vars
        var score = feature.get('score');
        if (!score) {
            return _defaultStyle;
        } else if (score < viewState.scoreCutoff) {
            // hide the feature
            return _hidden;
        } else {
            var styleSplit = viewState.scoreCutoff + (Math.abs(1.0 - viewState.scoreCutoff) / 2);
            var level = (score >= styleSplit ? 1 : 2) + resolution.toFixed(2);
            if (!_styleCache[level]) {
                var fillColor = score >= styleSplit ? _redC : _pinkC;
                var width = viewState.size;
                var fill = new ol.style.Fill({
                    color: fillColor.concat(0.5)
                });
                _styleCache[level] = new ol.style.Style({
                    fill: fill,
                    image: new ol.style.Circle({
                        radius: width + 1,
                        fill: fill
                    })
                });
            }
            return [_styleCache[level]];
        }
    };
    this.curriedStyleFunction = function (viewState) {
        return _.curry(_self.curryableStyleFunction)(viewState);
    };
}])

.factory('stealth.dragonfish.geo.ol3.layers.EntityLayer', [
'$log',
'$q',
'$rootScope',
'clickSearchHelper',
'stealth.dragonfish.Constant',
'stealth.core.geo.ol3.layers.MapLayer',
'stealth.dragonfish.geo.ol3.layers.styler',
'stealth.dragonfish.geo.ol3.layers.EntityConstant',
function ($log, $q, $rootScope, clickSearchHelper, DF, MapLayer, dfStyler, EL) {
    var tag = 'stealth.dragonfish.geo.ol3.layers.EntityLayer: ';
    $log.debug(tag + 'factory started');

    /**
     *  The `options` object must contain the following properties:
     *     1. `name`, the name of the new layers
     *     2. `features`, the array of ol.Feature(s)
     *     3. `categoryId`, the id of the category this entity layer belongs to
     *
     */
    var EntityLayer = function (options) {
        var _options = options || {};
        var _self = this;
        var _queryable = _options.queryable || false;
        var _zIndexHint = _options.zIndexHint || 20;
        var _features = _options.features;
        var _name  = _options.name;
        var _categoryid = _options.categoryId;
        var _viewState = {
            toggledOn: true,
            isError: false,
            errorMsg: '',
            scoreCutoff: 0.75,
            size: 4
        };
        var _ol3Source = new ol.source.Vector({
            features: _features
        });
        var _ol3Layer = new ol.layer.Vector({
            source: _ol3Source
        });
        $log.debug(tag + 'new Entity Layer(' + arguments[0] + ')');
        MapLayer.apply(_self, [_name, _ol3Layer, _queryable, _zIndexHint]);
        _self.styleDirective = 'st-entity-layer-style-view';
        _self.styleDirectiveScope.styleVars.iconClass = 'fa fa-fw fa-lg ' + DF.icon;
        _self.styleDirectiveScope.removeLayer = function () {
            $rootScope.$emit(EL.removeEvent, {layerId: _self.id, categoryId: _categoryid});
        };
        _self.styleDirectiveScope.entityStyler = dfStyler;
        _.set(_self, 'viewState', _viewState);
        var setStyle = function () {
            _self.ol3Layer.setStyle(dfStyler.curriedStyleFunction(_self.viewState));
        };
        setStyle();
        _self.styleDirectiveScope.getViewState = function () {
            return _self.viewState;
        };
        _self.styleDirectiveScope.updateMap = function () {
            setStyle();
            _self.ol3Layer.changed();
        };
        _self.searchPoint = function (coord, resolution) {
            var baseResponse = _.merge(this.getEmptySearchPointResult(), {
                getLayerLegendStyle: function () {
                    return {color: _viewState.fillColor};
                }
            });
            var extent = clickSearchHelper.getSearchExtent(coord, resolution);
            var nearbyFeatures = [];
            var trimmedFeatures;

            // If this layer is not toggled on, ...
            if (!_viewState.toggledOn || _viewState.isError) {
                return $q.when(baseResponse);
            }

            _ol3Source.forEachFeatureIntersectingExtent(extent, function (feature) {
                nearbyFeatures.push(feature);
            });

            trimmedFeatures = clickSearchHelper.sortAndTrimFeatures(coord, nearbyFeatures);
            return $q.when(_.merge(baseResponse, {
                isError: false,
                records: _.map(trimmedFeatures, function (feat) {
                    return _.pick(feat.getProperties(), ['id', 'name', 'score']);
                }),
                features: trimmedFeatures
            }));
        };
    };
    EntityLayer.prototype = Object.create(MapLayer.prototype);

    return EntityLayer;
}])

.directive('stEntityLayerStyleView', [
'$log',
function ($log) {
    var tag = 'stealth.dragonfish.geo.ol3.layers.stEntityLayerStyleView: ';
    $log.debug(tag + 'directive defined');
    return {
        templateUrl: 'dragonfish/geo/ol3/layers/entity-layerstyleview.tpl.html'
    };
}])
;
