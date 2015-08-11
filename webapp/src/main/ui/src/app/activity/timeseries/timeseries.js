/**
 * This module provides the `timeseriesService`, which creates a (singleton) popup to show the
 * time-series chart associated with a chosen site. Times of activity alerts are highlighted on the popup.
 */
angular.module('stealth.activity.timeseries', [
])

.constant('stealth.activity.timeseries.DOMConstants', {
    timeseriesContainer: 'timeseries',
    primaryDisplay: '.primaryDisplay'
})

.constant('stealth.activity.timeseries.PlotConstants', {
    xAxis: {
        type: 'time',
        label: {text: 'Date'}
    },
    yAxis: {
        label: {text: 'Count'}
    },
    line: {
        seriesIndexes: [0],
        stroke: '#CC0000',
        sort: true,
        tooltip: {type: 'global'}
    },
    overlayBars: {
        seriesKeys: 'Alerts',
        tooltip: {type: 'global'}
    },
    dateBefore: function (dtgMoment) {
        return dtgMoment.clone().add(7, 'days');
    },
    dateAfter: function (dtgMoment) {
        return dtgMoment.clone().subtract(3, 'months');
    }
})

/**
 * This service manages the fact that only one popup is allowed at a time, and knows how to poll
 * the server to obtain and parse the time-series layer for an alertLayer.
 */
.service('stealth.activity.timeseries.timeseriesService', [
'toastr',
'cqlHelper',
'elementAppender',
'stealth.activity.wfs',
'stealth.activity.timeseries.DOMConstants',
'stealth.activity.timeseries.PlotConstants',
function (toastr, cqlHelper, elementAppender, wfs, DOMConstants, PlotConstants) {
    var parseWFSResponse = function (alertLayer, response) {
        var counts = [], alerts = [];
        _.each(response.data.features, function (feature) {
            var date = moment(_.get(feature.properties, alertLayer.dtg.field));
            counts.push({
                id: feature.id,
                x: date.toDate(),
                y: _.get(feature.properties, alertLayer.timeseriesInfo.field.count)
            });
            if (_.get(feature.properties, alertLayer.timeseriesInfo.field.isAlert)) {
                alerts.push({
                    id: _.get(feature.properties, alertLayer.timeseriesInfo.field.alertId),
                    x: date.clone().subtract(24, 'h').toDate(),
                    x2: date.clone().add(24, 'h').toDate(),
                    y: feature.properties.count
                });
            }
        });
        return {
            counts: counts,
            alerts: alerts
        };
    };

    var createViz = function (parsedResponse, alertDescription) {
        var data = [
            {key: alertDescription, values: parsedResponse.counts},
            {key: PlotConstants.overlayBars.seriesKeys, values: parsedResponse.alerts}
        ];
        sonic.viz('#' + DOMConstants.timeseriesContainer, data)
            .addXAxis(PlotConstants.xAxis)
            .addYAxis(PlotConstants.yAxis)
            .addLine(PlotConstants.line)
            .addOverlayBars(PlotConstants.overlayBars)
            .addCrosshair();
    };

    var timeseriesEl = null;

    this.showTimeseries = function (alertLayer, alert, tsScope) {
        var buildTs = function () {
            var alertDescription = alertLayer.timeseriesInfo.description;
            var siteId = alert.get(alertLayer.siteInfo.field);
            var dtgMoment = moment.utc(alert.get(alertLayer.dtg.field));
            var cql = alertLayer.siteInfo.field + "='" + siteId + "'";
            if (dtgMoment && dtgMoment.isValid()) {
                var before = PlotConstants.dateBefore(dtgMoment);
                var after = PlotConstants.dateAfter(dtgMoment);
                var dtgCql = cqlHelper.buildDtgFilter(alertLayer.dtg.field, before, after, alertLayer.dtg.isString, alertLayer.dtg.formatter);
                cql = cqlHelper.combine(cqlHelper.operator.AND, cql, dtgCql);
            }
            wfs.getFeature(alertLayer.timeseriesInfo.layerName, {
                outputFormat: 'application/json',
                cql_filter: cql,
                version: null
            }).then(function (response) {
                createViz(parseWFSResponse(alertLayer, response), alertDescription);
            }, function () {
                toastr.alert('Alert retrieval failed');
            });
        };

        tsScope.timeseries = {
            title: alert.get(alertLayer.siteInfo.field) // get the site the alert was at
        };

        tsScope.close = function () {
            if (timeseriesEl) {
                timeseriesEl.remove();
                timeseriesEl = null;
            }
        };
        tsScope.close();
        elementAppender.append(
            DOMConstants.primaryDisplay,
            'activity/timeseries/timeseries.tpl.html',
            tsScope,
            function (el) {
                timeseriesEl = el;
                buildTs();
            }
        );
    };
}])
;
