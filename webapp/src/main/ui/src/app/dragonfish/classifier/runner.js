/**
 * Methods and classes associated with running a classifier
 */
angular.module('stealth.dragonfish.classifier.runner', [
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
'stealth.dragonfish.classifier.runner.Constant',
function (runnerConstant) {
    return function (name) {
        this.name = name;
        this.classifier = null;
        this.classifierLabel = null;
        this.imageId = null;
        this.geom = null;
        this.time = null;
        this.geomSource = runnerConstant.byid;
        this.slidingWindow = false;
    };
}])

/**
 * A service to actually 'run' (=apply) a classifier. This will become a WPS process, but we hard-code some example
 * data for now. Also, see notes related to results being simple Javascript objects, versus ol3 Features in a FeatureCollection.
 */
.service('stealth.dragonfish.classifier.runner.service', [
'$log',
'$q',
'stealth.dragonfish.ScoredEntity',
function ($log, $q, ScoredEntity) {
    this.run = function (queryParams) {
        $log.debug(queryParams); // no eslint error. we'll certainly use queryParams when we make the wps
        return $q.when([
            new ScoredEntity('1234', 'Hospital 1', 0.98, '', '', '', ''),
            new ScoredEntity('5678', 'Hospital 2', 0.89, '', '', '', ''),
            new ScoredEntity('9182', 'Hospitality Enterprises', 0.63, '', '', '', '')
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
