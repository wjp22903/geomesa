angular.module('stealth.dragonfish.geo.ol3.layers')

.constant('stealth.dragonfish.geo.ol3.layers.EntityConstant', {
    removeEvent: 'dragonfish.layer.entity.remove',
    chipStyle: {
        stroke: new ol.style.Stroke({
            color: '#DA4747',
            width: 2
        })
    },
    pinStyle: {
        text: new ol.style.Text({
            text: '\ue003', // map pin
            font: 'normal 26px CcriIcon',
            textBaseline: 'bottom',
            fill: new ol.style.Fill({
                color: '#DA4747'
            }),
            stroke: new ol.style.Stroke({
                color: 'black',
                width: 1
            })
        })
    }
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
'stealth.dragonfish.geo.ol3.layers.EntityConstant',
function (EL) {
    var _self = this;
    var _footprintStyle = new ol.style.Style(EL.chipStyle); // chip outline style set in constant
    var _markerStyle = new ol.style.Style(EL.pinStyle); // pin style set in constant

    var _hidden = new ol.style.Style();
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
    this.curryableStyleFunction = function (viewState, feature, resolution) {
        var score = feature.get('score');
        if (score < viewState.scoreCutoff) {
            return [_hidden];
        } else if (resolution > 0.0001) {
            return [_markerStyle];
        } else if (resolution > 0.00004) {
            return [_markerStyle, _footprintStyle];
        } else {
            return [_footprintStyle];
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
            scoreCutoff: 0.6,
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
                    return {display: 'none'};
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
                var score = feature.get('score');
                if (score >= _viewState.scoreCutoff) {
                    nearbyFeatures.push(feature);
                }
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
