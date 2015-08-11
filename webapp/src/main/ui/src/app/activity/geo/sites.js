angular.module('stealth.activity.geo.sites', [
])

.constant('stealth.activity.geo.sites.LayerDisplay', {
    styleName: 'stealth_dataPoints',
    styleEnv: 'color:00A300',
    titleSuffix: ' - sites',
    iconParams: 'FORMAT=image/png&WIDTH=12&HEIGHT=12&TRANSPARENT=true'
})

/**
 * Methods to add/remove and toggle the visibility of the sites layers in the category
 */
.service('stealth.activity.geo.monitoredSiteLayerService', [
'$timeout',
'ol3Map',
'stealth.core.interaction.mapclick.searchManager',
'stealth.core.geo.ol3.layers.WmsLayer',
'stealth.activity.Display',
'stealth.activity.geo.sites.LayerDisplay',
function ($timeout, ol3Map, searchManager, WmsLayer, ActivityDisplay, SiteLayerDisplay) {
    var addLayer = function (layer) {
        var wmsLayer = new WmsLayer({
            name: layer.Title + SiteLayerDisplay.titleSuffix,
            requestParams: {
                LAYERS: layer.siteInfo.layerName,
                STYLES: SiteLayerDisplay.styleName,
                ENV: SiteLayerDisplay.styleEnv
            },
            queryable: true,
            layerThisBelongsTo: layer
        });
        var ol3Layer = wmsLayer.getOl3Layer();
        layer.siteInfo.mapLayerId = wmsLayer.id;
        layer.siteInfo.viewState.isOnMap = true;
        layer.siteInfo.viewState.toggledOn = ol3Layer.getVisible();
        wmsLayer.styleDirectiveScope.styleVars.iconClass = 'fa fa-fw fa-lg ' + ActivityDisplay.icon;
        ol3Map.addLayer(wmsLayer);

        // Update viewState on layer visibility change.
        ol3Layer.on('change:visible', function () {
            $timeout(function () {
                layer.siteInfo.viewState.toggledOn = ol3Layer.getVisible();
            });
        });

        wmsLayer.styleDirectiveScope.$on(wmsLayer.id + ':isLoading', function (e) {
            layer.siteInfo.viewState.isLoading = true;
            e.stopPropagation();
        });

        wmsLayer.styleDirectiveScope.$on(wmsLayer.id + ':finishedLoading', function (e) {
            layer.siteInfo.viewState.isLoading = false;
            e.stopPropagation();
        });
    };

    var rmLayer = function (layer) {
        ol3Map.removeLayerById(layer.siteInfo.mapLayerId);
        delete layer.siteInfo.mapLayerId;
        layer.siteInfo.viewState.isOnMap = false;
        layer.siteInfo.viewState.toggledOn = false;
        if (_.isNumber(layer.siteInfo.searchId)) {
            searchManager.unregisterSearchableById(layer.siteInfo.searchId);
            delete layer.siteInfo.searchId;
        }
    };

    this.toggleLayer = function (layer) {
        if (_.isUndefined(layer.siteInfo.mapLayerId) || _.isNull(layer.siteInfo.mapLayerId)) {
            addLayer(layer);
        } else {
            rmLayer(layer);
        }
    };

    this.toggleVisibility = function (layer) {
        var mapLayer = ol3Map.getLayerById(layer.siteInfo.mapLayerId);
        var ol3Layer = mapLayer.getOl3Layer();
        ol3Layer.setVisible(!ol3Layer.getVisible());
    };
}])
;
