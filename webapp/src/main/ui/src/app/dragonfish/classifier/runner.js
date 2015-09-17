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
    geom: 'geom'
})

/**
 * These parameters should be presented to the user to fill in (i.e., in the wizard), and used to form the correct
 * request to the backend.
 */
.factory('stealth.dragonfish.classifier.runner.QueryParams', [
'stealth.dragonfish.classifier.runner.queryParamsGeomService',
'stealth.dragonfish.classifier.runner.Constant',
function (geomService, runnerConstant) {
    return function (name) {
        this.name = name;
        this.classifier = null;
        this.classifierLabel = null;
        this.imageId = null;
        this.time = null;
        this.geomSource = runnerConstant.byid;
        this.slidingWindow = false;
        this.geom = geomService.initialGeom();
        this.checkAndSetBounds = function (extent, skipCookie) {
            _.merge(this.geom, geomService.checkAndSetBounds(extent, skipCookie));
        };
    };
}])

/**
  * A service to grab cached extents from cookies,
  * consider further refactoring to make this a common util
  */
.service('stealth.dragonfish.classifier.runner.queryParamsGeomService', [
'$filter',
'cookies',
function ($filter, cookies) {
    var _geom = {
        maxLat: 90,
        minLat: -90,
        maxLon: 180,
        minLon: -180
    };
    this.initialGeom = function () {
        return _.merge(_geom, cookies.get('dragonfish.wizard.bbox', 0));
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
            cookies.put('dragonfish.wizard.bbox', 0, bbox, moment.utc().add(1, 'y'));
        }
        return bbox;
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
            scoredEntity('1234', 'Hospital 1', 0.98, '', '', '', ''),
            scoredEntity('5678', 'Hospital 2', 0.89, '', '', '', ''),
            scoredEntity('9182', 'Hospitality Enterprises', 0.63, '', '', '', '')
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
