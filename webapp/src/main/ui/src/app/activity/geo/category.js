/**
 * The category for activity alerts shows the lists of monitored site layers.
 * As alerts are queried for (via the wizard), a "filter" layer is added beneath the associated site.
 */
angular.module('stealth.activity.geo', [
    'stealth.activity.geo.sites',
    'stealth.activity.wizard'
])

.constant('stealth.activity.geo.AlertsDisplay', {
    alertColor: 'E60000', // same as in the fill below
    alertShape: 'triangle',
    pointStyle: new ol.style.Style({
        image: new ol.style.RegularShape({
            fill: new ol.style.Fill({color: '#E60000'}),
            stroke: new ol.style.Stroke({color: 'black', width: 1}),
            points: 3,
            radius: 9
        })
    }),
    highlightStyle: new ol.style.Style({
        image: new ol.style.RegularShape({
            fill: new ol.style.Fill({color: '#FFCC00'}),
            stroke: new ol.style.Stroke({color: 'black', width: 2}),
            points: 3,
            radius: 10
        })
    })
})

/**
 * Manages all icon information for the category, with the help of style constants
 */
.service('stealth.activity.geo.iconService', [
'CONFIG',
'stealth.activity.geo.sites.LayerDisplay',
'stealth.activity.geo.AlertsDisplay',
function (CONFIG, SiteLayerDisplay, AlertsDisplay) {
    var baseParams = 'REQUEST=GetLegendGraphic&' + SiteLayerDisplay.iconParams;
    var iconUrl = function (layer, style, env) {
        return CONFIG.geoserver.defaultUrl + '/wms?' + baseParams + '&LAYER=' + layer + '&STYLE=' + style + '&ENV=' + env;
    };
    this.siteIconUrl = function (layer) {
        return iconUrl(layer.siteInfo.layerName, SiteLayerDisplay.styleName, SiteLayerDisplay.styleEnv);
    };
    this.alertIconUrl = function (layer) {
        var styleEnv = 'color:' + AlertsDisplay.alertColor + ';shape:' + AlertsDisplay.alertShape;
        return iconUrl(layer.Name, SiteLayerDisplay.styleName, styleEnv);
    };
}])

/**
 * Load alert layers on application startup, to display site layers in the category.
 */
.run([
'$rootScope',
'categoryManager',
'ol3Map',
'stealth.activity.Display',
'stealth.activity.alerts.layerService',
'stealth.activity.geo.iconService',
'stealth.activity.geo.monitoredSiteLayerService',
'stealth.activity.wizard.activityWizard',
'stealth.core.geo.ol3.manager.Category',
'stealth.core.utils.WidgetDef',
function ($rootScope, catMgr, ol3Map, ActivityDisplay, layerService, iconService, monitoredSiteLayerService, wizard, Category, WidgetDef) {
    var scope = $rootScope.$new();
    scope.workspaces = {};

    layerService.getLayers(false)
        .then(function (workspaces) {
            scope.workspaces = workspaces;
        });

    scope.toggleMonitoredSiteLayer = function (layer) {
        monitoredSiteLayerService.toggleLayer(layer);
    };
    scope.toggleMonitoredSiteVisibility = function (layer) {
        monitoredSiteLayerService.toggleVisibility(layer);
    };
    scope.launchLayerFilterWizard = function (layer) {
        var layers = _.flatten(_.values(scope.workspaces));
        wizard.launch(layers, layer);
    };
    scope.toggleFilterLayerVisibility = function (filterLayer) {
        var tempLayer = ol3Map.getLayerById(filterLayer.mapLayerId);
        if (_.has(tempLayer, 'ol3Layer')) {
            var visible = tempLayer.ol3Layer.getVisible();
            tempLayer.ol3Layer.setVisible(!visible);
            _.assign(filterLayer, {'visible': !visible});
        }
    };
    scope.removeLayer = function (layer, filterLayer) {
        ol3Map.removeLayerById(filterLayer.mapLayerId);
        delete filterLayer.mapLayerId;
        _.pull(layer.filterLayers, filterLayer);
    };
    scope.siteIconUrl = function (layer) {
        return iconService.siteIconUrl(layer);
    };
    scope.alertIconUrl = function (layer) {
        return iconService.alertIconUrl(layer);
    };

    catMgr.addCategory(1, new Category(1, ActivityDisplay.title, ActivityDisplay.icon,
        new WidgetDef('st-activity-geo-category', scope), null, true));
}])

.directive('stActivityGeoCategory', [
function () {
    return {
        templateUrl: 'activity/geo/category.tpl.html'
    };
}])
;
