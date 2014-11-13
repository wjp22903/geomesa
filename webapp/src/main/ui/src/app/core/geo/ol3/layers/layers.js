angular.module('stealth.core.geo.ol3.layers', [
])

.factory('MapLayer', [
'$rootScope',
function ($rootScope) {
    var _idSeq = 0;
    var MapLayer = function (name, ol3Layer) {
        this.id = _idSeq++;
        this.name = name;
        this.ol3Layer = ol3Layer;
        this.styleDirective = 'st-map-layer-style';
        if (ol3Layer) {
            var scope = $rootScope.$new();
            scope.visible = ol3Layer.getVisible();
            ol3Layer.set('id', this.id);
            ol3Layer.set('name', name);
            scope.ol3Layer = ol3Layer;
            this.styleDirectiveScope = scope;
        }
    };

    MapLayer.prototype.getStyleDirective = function () {
        return this.styleDirective;
    };
    MapLayer.prototype.getStyleDirectiveScope = function () {
        return this.styleDirectiveScope;
    };
    MapLayer.prototype.getId = function () {
        return this.id;
    };
    MapLayer.prototype.getOl3Layer = function () {
        return this.ol3Layer;
    };

    return MapLayer;
}])

.directive('stMapLayerStyle', [
function () {
    return {
        template: '<div style="background-color:white;margin:2px;padding:2px;border-radius:4px;">\
                       <input type="checkbox" ng-model="visible" ng-change="ol3Layer.setVisible(visible)">\
                       {{ol3Layer.get("name") || ol3Layer.get("id") | characters:30:true}}\
                   </div>'
    };
}])

.factory('GeoJsonLayer', [
'MapLayer',
function (MapLayer) {
    var GeoJsonLayer = function () {
        MapLayer.apply(this, arguments);
        this.styleDirective = 'st-geo-json-layer-style';
    };
    GeoJsonLayer.prototype = new MapLayer();
    return GeoJsonLayer;
}])

.directive('stGeoJsonLayerStyle', [
function () {
    return {
        template: '<div style="background-color:white;margin:2px;padding:2px;border-radius:4px;">\
                       <input type="checkbox" ng-model="visible" ng-change="ol3Layer.setVisible(visible)">\
                       {{ol3Layer.get("name") || ol3Layer.get("id") | characters:30:true}}\
                   </div>'
    };
}])
;
