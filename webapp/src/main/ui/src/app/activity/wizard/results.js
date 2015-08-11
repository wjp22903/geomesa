angular.module('stealth.activity.wizard.results', [
    'stealth.core.geo.ol3.overlays',
    'stealth.activity.geo',
    'stealth.activity.timeseries'
])

.constant('stealth.activity.wizard.results.PanelDisplay', {
    title: 'Activity Alerts',
    width: 400
})

/**
 * Container for the results of running a wizard. The Panel ties together its scope, alertLayer, and filterLayer.
 * This `constant` just provides a constructor for `Panel`s
 */
.factory('stealth.activity.wizard.results.Panel', [
function () {
    return function (scope, alertLayer, filterLayer) {
        this.scope = scope;
        this.scope.alertLayer = alertLayer;
        this.scope.mapLayer = null;
        this.filterLayer = filterLayer;

        this.setMapLayer = function (mapLayer) {
            this.filterLayer.setMapLayer(mapLayer);
            this.scope.mapLayer = mapLayer;
        };

        this.removeFilterLayer = function () {
            _.pull(this.scope.alertLayer.filterLayers, filterLayer);
        };
    };
}])

/**
 * Factored out sidebar interaction for the results.
 * This service provides a helper method to add a button to the sidebar, and immediately activate it.
 */
.service('stealth.activity.wizard.results.sidebarService', [
'sidebarManager',
'stealth.core.utils.WidgetDef',
'stealth.activity.Display',
'stealth.activity.wizard.results.PanelDisplay',
function (sidebarManager, WidgetDef, ActivityDisplay, PanelDisplay) {
    this.addButton = function (scope, onClose) {
        sidebarManager.toggleButton(
            sidebarManager.addButton(PanelDisplay.title, ActivityDisplay.icon, PanelDisplay.width,
                new WidgetDef('st-activity-alerts', scope),
                null, false,
                _.isFunction(onClose) ? onClose : _.noop
            ),
            true
        );
    };
}])

/**
 * Once the wizard has completed, we want to initialize the panel on the left, and show alert cards
 * in that panel, when they have been obtained.
 */
.service('stealth.activity.wizard.results.resultsService', [
'$rootScope',
'ol3Map',
'stealth.core.geo.ol3.layers.MapLayer',
'stealth.activity.Display',
'stealth.activity.geo.AlertsDisplay',
'stealth.activity.wizard.results.Panel',
'stealth.activity.wizard.results.sidebarService',
function ($rootScope, ol3Map, MapLayer, ActivityDisplay, AlertsDisplay, Panel, sidebarService) {
    this.init = function (layer, filterLayer) {
        layer.filterLayers.push(filterLayer);
        var panelScope = $rootScope.$new();
        var panel = new Panel(panelScope, layer, filterLayer);
        sidebarService.addButton(panelScope, function () {
            // On Close, remove the alerts layer from the map and destroy the panelScope.
            ol3Map.removeLayerById(filterLayer.mapLayerId);
            panel.removeFilterLayer();
            panelScope.$destroy();
        });
        return panel;
    };

    this.setFeatures = function (panel, features) {
        var mapLayer = new MapLayer(panel.scope.alertLayer.Title + ' - alerts', new ol.layer.Vector({
            source: new ol.source.Vector({
                features: features
            }),
            style: AlertsDisplay.pointStyle
        }));
        mapLayer.styleDirectiveScope.styleVars.iconClass = 'fa fa-fw fa-lg ' + ActivityDisplay.icon;
        ol3Map.addLayer(mapLayer);
        panel.setMapLayer(mapLayer);
    };
}])

/**
 * This directive is used as a left-hand panel to show the list of alerts.
 * Mousing over an alert highlights the associated feature.
 * Clicking an alert brings up the associated timeseries.
 */
.directive('stActivityAlerts', [
'$rootScope',
'stealth.core.geo.ol3.overlays.Vector',
'stealth.activity.timeseries.timeseriesService',
'stealth.activity.geo.AlertsDisplay',
function ($rootScope, VectorOverlay, timeseriesService, AlertsDisplay) {
    return {
        restrict: 'E',
        templateUrl: 'activity/wizard/results.tpl.html',
        controller: ['$scope', function ($scope) {
            var featureOverlay = new VectorOverlay({
                styleBuilder: function () {
                    return AlertsDisplay.highlightStyle;
                }
            });
            featureOverlay.addToMap();

            $scope.$on('$destroy', function () {
                featureOverlay.removeFromMap();
            });

            $scope.alertSort = function (value) {
                return value.get($scope.alertLayer.dtg.field);
            };
            $scope.highlight = function (alert) {
                alert.highlightFeature = alert.clone();
                featureOverlay.addFeature(alert.highlightFeature);
            };
            $scope.unhighlight = function (alert) {
                if (alert.highlightFeature) {
                    featureOverlay.removeFeature(alert.highlightFeature);
                    delete alert.highlightFeature;
                }
            };
            $scope.showTimeseries = function (alert) {
                timeseriesService.showTimeseries($scope.alertLayer, alert, $rootScope.$new());
            };
        }]
    };
}])
;
