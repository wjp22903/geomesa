angular.module('stealth.core.utils', [
    'stealth.core.geo.ol3.format',
    'stealth.core.geo.ol3.geodetics'
])

.service('clickSearchHelper', [
'ol3Geodetics',
'stealth.core.geo.ol3.format.GeoJson',
'CONFIG',
function (ol3Geodetics, GeoJson, CONFIG) {
    var defaultStrategy = CONFIG.map.clicksearch.strategy;
    var defaultFixedPixelBuffer = CONFIG.map.clicksearch.fixedPixelBuffer;
    var defaultZoomMeterBuffer = CONFIG.map.clicksearch.zoomMeterBuffer;
    var parser = new GeoJson();
    var mapProj = new ol.proj.Projection({
        code: CONFIG.map.projection,
        units: CONFIG.map.units
    });

    function isZoomStrategy (strat) {
        return strat.indexOf('zoom') !== -1;
    }

    function isNearestStrategy (strat) {
        return strat.indexOf('nearest') !== -1;
    }

    this.getLayerOverrides = function (KeywordConfig) {
        var overrides = {};
        if (_.has(KeywordConfig, 'click.search.strategy')) {
            overrides.strategy = _.get(KeywordConfig, 'click.search.strategy');
        }
        if (_.has(KeywordConfig, 'click.search.fixed.pixelBuffer')) {
            overrides.fixedPixelBuffer = _.get(KeywordConfig, 'click.search.fixed.pixelBuffer');
        }
        if (_.has(KeywordConfig, 'click.search.zoom.meterBuffer')) {
            overrides.zoomMeterBuffer = _.get(KeywordConfig, 'click.search.zoom.meterBuffer');
        }
        return overrides;
    };

    this.getSearchExtent = function (coord, res, overrides) {
        overrides = overrides || {};
        var lon = coord[0];
        var lat = coord[1];

        var pixelBuffer = overrides.fixedPixelBuffer || defaultFixedPixelBuffer;
        var meterBuffer = overrides.zoomMeterBuffer || defaultZoomMeterBuffer;
        var strategy = overrides.strategy || defaultStrategy;
        var modifier = res * pixelBuffer;

        if (isZoomStrategy(strategy)) {
            modifier = Math.max(modifier, meterBuffer / mapProj.getMetersPerUnit());
        }

        return [
            lon - modifier,
            lat - modifier,
            lon + modifier,
            lat + modifier
        ];
    };

    this.sortAndTrimFeatures = function (coord, features, overrides) {
        overrides = overrides || {};
        var sorted = _.sortBy(features, function (feat) {
            var geom;
            var props = _.isFunction(feat.getProperties) ? feat.getProperties() : feat.properties;
            if (overrides.geom && _.contains(_.keys(props), overrides.geom)) {
                geom = parser.readGeometry(props[overrides.geom]);
            }
            if (!geom) {
                geom = _.isFunction(feat.getGeometry) ? feat.getGeometry() : parser.readGeometry(feat.geometry);
            }
            return ol3Geodetics.distanceHaversine([coord, geom.getClosestPoint(coord)]);
        });
        var strategy = overrides.strategy || defaultStrategy;

        if (isNearestStrategy(strategy)) {
            var split = strategy.split('-');
            var takeSize = 1;
            if (split.length >= 3) {
                takeSize = parseInt(strategy.split('-')[2], 10) || takeSize;
            }
            return _.take(sorted, takeSize);
        } else {
            return sorted;
        }
    };
}])
;
