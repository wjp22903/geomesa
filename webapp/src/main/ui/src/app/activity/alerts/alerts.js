/**
 * This module mostly manages the notion of a FilteredAlertsLayer
 */
angular.module('stealth.activity.alerts', [
])

/**
 * To have an "activity"-enabled layer, we expect to find a keyword on the "alerts" layer:
 *   <ctx>.activity.<workspace>
 * with additional data. In particular, we need pointers to the timeseries layer, and the monitored sites layer.
 * These should be set as:
 *   <ctx>.activity.<workspace>.sites.layerName=workspace:layername
 *   <ctx>.activity.<workspace>.timeseries.layerName=workspace:layername
 *
 * You can control the series title in the time-series popup with:
 *   <ctx>.activity.<workspace>.timeseries.description=Title
 * and the title of the sites layer in the Map Layers panel with:
 *   <ctx>.activity.<workspace>.sites.title=Title
 *
 * Additional knobs are available for non-standard SFTs, with lesser documentation below
 */
.constant('stealth.activity.alerts.Keywords', {
    primary: 'activity', // all keywords begin with `<ctx>.activity` and are grouped by subsequent `.<workspace>`

    /**
     * <ctx>.activity.<workspace>.sites should have the following structure:
     *   .layerName=(geoserverWorkspace:geoserverLayer) // required
     *   .title=Title to show in the layer manager // optional (default 'Monitored Sites')
     * You can change the attribute in the alertLayer which gives the name of the site the alert was at using:
     *   <ctx>.activity.<workspace>.field.site.name
     */
    siteInfo: 'sites', // grouping portion of keyword after <workspace>, for site-associated information

    /**
     * <ctx>.activity.<workspace>.timeseries should have the following structure:
     *   .layerName=(geoserverWorkspace:geoserverLayer) // required
     *   .description=Name of the timeseries serie in the timeseries plot // optional (default 'Time series')
     * You can change attribute mappings with <ctx>.activity.<workspace>.timeseries.field keywords:
     *   .field.count.name=NameOfCountAttrInTimeseriesSFT // optional (default 'count')
     *   .field.isAlert.name=IsAlertAttrName // optional (default 'is_alert')
     *   .field.alertId.name=AlertIdAttrName // optional (default 'alert_id')
     */
    timeseriesInfo: 'timeseries', // grouping portion of keyword after <workspace>, for site-associated information

    /**
     * <ctx>.activity.<workspace>.field.dtg can be used to change the attribute mappings
     * for the alerts and timeseries layers, in particular for the dtg attribute.
     * It should have the following structure:
     *   .name=NameOfDTGAttributeInAlertSFT // optional (default 'dtg')
     *   .isString=<boolean> // optional, is the dtg attribute a string (default false, indicating Date attribute)
     *   .format=FormatStr // required if .isString
     *   .formatUTC=<boolean> // should the format be produced in UTC (default true)
     */
    dtg: {
        field: 'field.dtg.name', // the dtg attribute name for the alerts and time-series layers
        defaultField: 'dtg', // default value for dtg attribute name
        fieldIsString: 'field.dtg.isString', // is the dtg attribute a string (default: false)
        fieldFormat: 'field.dtg.format', // for string dtg attributes, the format
        fieldFormatUTC: 'field.dtg.formatUTC' // for string dtg attributes, if the format is UTC (default: true)
    },

    // the remainder of this constant sets up default values and internal conveniences
    site: {
        attributeNameConfigKey: 'field.site.name',
        defaultField: 'site_name',
        defaultTitle: 'Monitored Sites'
    },
    timeseries: {
        defaultFields: {
            count: 'count',
            isAlert: 'is_alert',
            alertId: 'alert_id'
        },
        defaultDescription: 'Time series'
    }
})

.factory('stealth.activity.alerts.AlertLayerDtgInfo', [
'stealth.activity.alerts.Keywords',
function (Keywords) {
    return function (config) {
        this.field = _.get(config, Keywords.dtg.field, Keywords.dtg.defaultField);
        this.isString = !!_.get(config, Keywords.dtg.fieldIsString, false);
        this.fieldFormat = _.get(config, Keywords.dtg.fieldFormat, null);
        this.fieldFormatUTC = _.get(config, Keywords.dtg.fieldFormatUTC, true);
        this.formatter = null;
        if (this.isString) {
            if (this.fieldFormatUTC) {
                this.formatter = function (dtg) { return moment(dtg).utc().format(this.fieldFormat); };
            } else {
                this.formatter = function (dtg) { return moment(dtg).format(this.fieldFormat); };
            }
        }
    };
}])

.factory('stealth.activity.alerts.AlertLayerSiteInfo', [
'stealth.activity.alerts.Keywords',
function (Keywords) {
    return function (config) {
        _.assign(this, _.get(config, Keywords.siteInfo)); // expect this to have, at least, layerName
        this.title = this.title || Keywords.site.defaultTitle; // may have come in through siteInfo
        this.field = _.get(config, Keywords.site.attributeNameConfigKey, Keywords.site.defaultField);
        this.viewState = {
            isOnMap: false,
            toggledOn: false,
            isLoading: false
        };
    };
}])

.factory('stealth.activity.alerts.AlertLayerTimeseriesInfo', [
'stealth.activity.alerts.Keywords',
function (Keywords) {
    return function (config) {
        _.assign(this, _.get(config, Keywords.timeseriesInfo)); // expect this to have, at least, layerName
        this.description = this.description || Keywords.timeseries.defaultDescription; // may have come in with _.assign
        this.field = _.defaults(this.field || {}, Keywords.timeseries.defaultFields);
    };
}])

.factory('stealth.activity.alerts.AlertLayer', [
'stealth.activity.alerts.AlertLayerDtgInfo',
'stealth.activity.alerts.AlertLayerSiteInfo',
'stealth.activity.alerts.AlertLayerTimeseriesInfo',
function (DtgInfo, SiteInfo, TimeseriesInfo) {
    return function (geoserverLayer, config) {
        // the only bits of the geoserverLayer that we keep are the Name and Title
        this.Name = geoserverLayer.Name;
        this.Title = geoserverLayer.Title;

        // parse Keyword structure into layer properties, for use throughout the plugin
        this.siteInfo = new SiteInfo(config);
        this.timeseriesInfo = new TimeseriesInfo(config);
        this.dtg = new DtgInfo(config);

        // Filtrations of the alerts in this layer, generally the result of running the wizard
        // One alert layer may be used several times from the wizard, to compare alerts across time spans,
        // and all of the filtered versions are kept associated with the primary layer, in this array.
        // This array will be populated with instances of 'stealth.activity.alerts.FilteredAlertsLayer'
        this.filterLayers = [];
    };
}])

/**
 * This service is responsible to finding activity-enabled layers.
 * Use `getLayers`, with an optional boolean argument to force a refresh of the available layers, to obtain
 * a workspace-delineated array of activity-enabled "alert" layers. That is, the result of `getLayers` is an
 * object, with a key for each workspace, each having an associated value which is
 * an array of `ActivityLayer`s in that workspace.
 */
.service('stealth.activity.alerts.layerService', [
'$q',
'owsLayers',
'stealth.activity.alerts.AlertLayer',
'stealth.activity.alerts.Keywords',
function ($q, owsLayers, AlertLayer, Keywords) {
    var lastWorkspaces = null;

    var createWorkspaces = function (layers) {
        var workspaces = {};
        _.each(layers, function (layer) {
            _.each(_.get(layer.KeywordConfig, Keywords.primary), function (config, workspace) {
                if (!_.isArray(workspaces[workspace])) {
                    workspaces[workspace] = [];
                }
                workspaces[workspace].push(new AlertLayer(layer, config));
            });
        });
        return workspaces;
    };

    this.getLayers = function (forceRefresh) {
        if (!!forceRefresh || _.isNull(lastWorkspaces)) {
            return owsLayers.getLayers(Keywords.primary, forceRefresh)
                .then(function (layers) {
                    lastWorkspaces = createWorkspaces(layers);
                    return lastWorkspaces;
                });
        } else {
            return $q.when(lastWorkspaces);
        }
    };
}])

/**
 * Functions to calculate display-relevant information for a FilteredAlertsLayer.
 * Generally used in the category in the Map Layer manager.
 */
.constant('stealth.activity.alerts.FilteredAlertsLayerDisplay',
(function () {
    var descriptionDtgFormat = 'YYYY-MM-DD[T]HH:mm[Z]';
    return {
        layerName: function () {
            return 'Alerts';
        },
        layerDescription: function (startDtg, endDtg) {
            return startDtg.format(descriptionDtgFormat) + ' - ' + endDtg.format(descriptionDtgFormat);
        }
    };
})())

/**
 * A FilteredAlertsLayer is the showable results of searching for activity-based alerts.
 */
.factory('stealth.activity.alerts.FilteredAlertsLayer', [
function () {
    return function (name, description, cqlFilter) {
        this.name = name;
        this.description = description;
        this.cqlFilter = cqlFilter;

        this.removeable = true;
        this.visible = false;
        this.mapLayerId = null;

        this.setMapLayer = function (mapLayer) {
            this.mapLayerId = mapLayer.id;
            this.visible = true;
        };
    };
}])

/**
 * Helper service to create a FilteredAlertsLayer
 */
.service('stealth.activity.alerts.filteredAlertsLayerService', [
'cqlHelper',
'stealth.activity.alerts.FilteredAlertsLayer',
'stealth.activity.alerts.FilteredAlertsLayerDisplay',
function (cqlHelper, FilteredAlertsLayer, Display) {
    this.fromParams = function (layer, startDtg, endDtg) {
        return new FilteredAlertsLayer(
            Display.layerName(layer, startDtg, endDtg),
            Display.layerDescription(startDtg, endDtg),
            cqlHelper.buildDtgFilter(layer.dtg.field, startDtg, endDtg, layer.dtg.isString, layer.dtg.formatter)
        );
    };
}])
;
