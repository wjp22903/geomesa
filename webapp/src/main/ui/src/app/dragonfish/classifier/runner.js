/**
 * Methods and classes associated with running a classifier
 */
angular.module('stealth.dragonfish.classifier.runner', [
    'stealth.core.utils.cookies'
])

/**
 * Create constants for the wizard scope
 */
.constant('stealth.dragonfish.classifier.runner.Constant', {
    byid: 'byid',
    geom: 'geom',
    cookies: {
        geom: 'dragonfish.wizard.bbox',
        time: 'dragonfish.wizard.time'
    }
})

/**
 * These parameters should be presented to the user to fill in (i.e., in the wizard), and used to form the correct
 * request to the backend.
 */
.factory('stealth.dragonfish.classifier.runner.QueryParams', [
'stealth.dragonfish.Constant',
'stealth.dragonfish.classifier.runner.Constant',
'stealth.dragonfish.classifier.runner.queryParamsService',
function (DF, runnerConstant, paramService) {
    return function (name) {
        this.name = name;
        this.classifier = null;
        this.classifierLabel = null;
        this.imageId = null;
        this.timeData = {
            // when the query timeData is valid, we should have a `valid:true
            // but _not_ until the data is valid. see the wizard template
            startDtg: null,
            endDtg: null,
            maxTimeRangeMillis: Number.POSITIVE_INFINITY
        };
        _.merge(this.timeData, paramService.initialTimerange());
        this.geomSource = null;
        this.slidingWindow = false;
        this.geom = paramService.initialGeom();
        this.checkAndSetBounds = function (extent, skipCookie) {
            _.merge(this.geom, paramService.checkAndSetBounds(extent, skipCookie));
        };
        this.checkAndSetTimeRange = function (start, end, skipCookie) {
            /**
             * The logic here is a little delicate, as we require that `valid` is only set when valid,
             * and not set to `false` (or anything else!) when invalid.
             */
            delete this.timeData.valid;
            delete this.timeData.errorMsg;
            _.merge(this.timeData,
                paramService.checkAndSetTimeRange(
                    start, end, this.timeData.maxTimeRangeMillis, skipCookie)
            );
        };
        this.isNonImageSpace = function () {
            if (this.classifier) {
                return this.classifier.space !== DF.space.imagery;
            }
            return true;
        };
        this.isGeomSource = function () {
            return this.geomSource === runnerConstant.geom;
        };
        this.isImageIdSource = function () {
            return this.geomSource === runnerConstant.byid;
        };
        this.hasSingleLabel = function () {
            return (this.classifier && this.classifier.labels.length === 1);
        };
    };
}])

/**
  * A service to grab cached extents from cookies,
  * consider further refactoring to make this a common util
  */
.service('stealth.dragonfish.classifier.runner.queryParamsService', [
'$filter',
'cookies',
'stealth.dragonfish.classifier.runner.Constant',
function ($filter, cookies, RUN) {
    var _geom = {
        maxLat: 90,
        minLat: -90,
        maxLon: 180,
        minLon: -180
    };
    var _time = {
        startDtg: moment.utc().subtract(1, 'week'),
        endDtg: moment.utc()
    };
    this.initialGeom = function () {
        return _.merge(_geom, cookies.get(RUN.cookies.geom, 0));
    };
    this.checkAndSetBounds = function (extent, skipCookie) {
        var filter = $filter('number');
        var trimmed = _.map(extent, function (val) {
            return parseFloat(filter(val, 5));
        });
        var bbox = {
            minLon: trimmed[0] < -180 ? -180 : trimmed[0],
            minLat: trimmed[1] < -90 ? -90 : trimmed[1],
            maxLon: trimmed[2] > 180 ? 180 : trimmed[2],
            maxLat: trimmed[3] > 90 ? 90 : trimmed[3]
        };
        if (!skipCookie && !_.contains(trimmed, NaN)) {
            //Save cookie - expires in a year
            cookies.put(RUN.cookies.geom, 0, bbox, moment.utc().add(1, 'y'));
        }
        return bbox;
    };
    this.initialTimerange = function () {
        _.merge(
            _time,
            cookies.get(RUN.cookies.time, 0),
            _.mapValues(cookies.get(RUN.cookies.time, 0), function (time) {
                return time ? moment.utc(time) : null;
            })
        );
        return _time;
    };
    var timeRangeError = function (msg) {
        return {
            errorMsg: msg
        };
    };
    /**
     * If you try to set the time to something bad (start after end, or something),
     * We return an object literal with an `errorMsg` (string). Otherwise, we return
     * an object literal with `valid: true`.
     * In the non-error case, we also set the associated cookie (depending on skipCookie)
     */
    this.checkAndSetTimeRange = function (start, end, maxTimeRangeMillis, skipCookie) {
        if (!moment.isMoment(start)) {
            return timeRangeError('Invalid start time');
        } else if (!moment.isMoment(end)) {
            return timeRangeError('Invalid end time');
        } else {
            var diffMillis = end.diff(start);
            if (diffMillis < 1) {
                return timeRangeError('End time must be after start time');
            } else if (_.isNumber(maxTimeRangeMillis) && diffMillis > maxTimeRangeMillis) {
                return timeRangeError('Range must be less than ' + $filter('millisToDHMS')(maxTimeRangeMillis, true));
            }
        }
        if (!skipCookie) {
            //Save cookie - expires in a year
            cookies.put('dragonfish.wizard.time', 0, {startDtg: start, endDtg: end}, moment.utc().add(1, 'y'));
        }
        return {valid: true};
    };
}])

/**
 * A service to actually 'run' (=apply) a classifier. This will become a WPS process, but we hard-code some example
 * data for now. Also, see notes related to results being simple Javascript objects, versus ol3 Features in a FeatureCollection.
 */
.service('stealth.dragonfish.classifier.runner.service', [
'$log',
'$q',
'stealth.dragonfish.scoredEntity',
function ($log, $q, scoredEntity) {
    this.run = function (queryParams) {
        $log.debug(queryParams); // no eslint error. we'll certainly use queryParams when we make the wps
        return $q.when([
            scoredEntity('1234', 'Hospital 1', 0.98, new ol.geom.Point([10, 45]), '', '', ''),
            scoredEntity('5678', 'Hospital 2', 0.89, new ol.geom.Polygon([[[-8.437, 54.977], [-8.437, 58.263], [1.406, 58.263], [1.406, 54.977], [-8.437, 54.977]]]), '', '', ''),
            scoredEntity('9182', 'Hospitality Enterprises', 0.63, new ol.geom.Point([-21.972, 64.244]), '', '', '')
        ]);
    };
}])

/**
 * Set up event listener. The wizard is the only producer of this event for now.
 */
.run([
'$rootScope',
'stealth.dragonfish.resultsService',
'stealth.dragonfish.classifier.Constant',
'stealth.dragonfish.classifier.runner.service',
function ($rootScope, resultsService, ClassConstant, runnerService) {
    $rootScope.$on(ClassConstant.applyEvent, function (evt, req) { // eslint-disable-line no-unused-vars
        runnerService.run(req)
            .then(function (response) {
                resultsService.display(req, response);
            });
    });
}])
;