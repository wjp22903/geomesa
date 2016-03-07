angular.module('stealth.grizzlybear.wizard', [
])

.run([
'startMenuManager',
'grizzlybearWizard',
function (startMenuManager, grizzlybearWizard) {
    startMenuManager.addButton('GrizzlyBear Batch Time', 'fa-sort-amount-asc', grizzlybearWizard.launch);
}])

.service('grizzlybearWizard', [
'$q',
'$log',
'$rootScope',
'$filter',
'ol3Map',
'wizardManager',
'colors',
'cqlHelper',
'stealth.core.geo.ol3.layers.MapLayer',
'stealth.core.wizard.Step',
'stealth.core.wizard.Wizard',
'stealth.core.utils.WidgetDef',
'stealth.grizzlybear.wizard.query.BtQuery',
'stealth.grizzlybear.geo.query.CQLGenerator',
'owsLayers',
'wfs',
'wps',
'toastr',
'boundsHelper',
'CONFIG',
function ($q, $log, $rootScope, $filter,
          ol3Map, wizardManager, colors, cqlHelper,
          MapLayer, Step, Wizard, WidgetDef, BtQuery, cqlGenerator, owsLayers, wfs, wps, toastr, boundsHelper, CONFIG) {
    this.launch = function () {
/*
        $q.all([
            wfs.getFeature(
                'http://192.168.1.60:8080/geoserver/gb_jw9bn',
                'gb_jw9bn:BatchTime',
                true,
                {},
                'text',
                false
            )
        ]).then(function (response) {
            var timeFeatures = response[0],
                formattedTimeFeatures,
                testVar;
            formattedTimeFeatures = timeFeatures.data.features
                .map(function (d) {
                    return moment.tz(d.properties.batchTime, 'utc');
                })
                .sort(function (a, b) {
                    return a.valueOf() - b.valueOf();
                });

            testVar = "for test";

            var wizScope = $rootScope.$new();
            var steps = [];

            wizScope.btquery = new BtQuery(formattedTimeFeatures);

            var useMask = true;
            steps.push(new Step('Choose batch time',
                                new WidgetDef('st-bt-wiz-layer', wizScope),
                                null,
                                true,
                                null
                               ));

            var wiz = new Wizard('Grizzly-Bear Batch Time', 'fa-line-chart', 'fa-check text-success', steps, wizScope, 'btWizardForm');
            wizardManager.launchWizard(wiz);

        });

        var testP;

        testP = "test";
*/

        var wizScope = $rootScope.$new();
        var steps = [];

        wizScope.btquery = new BtQuery();

        var useMask = true;
        var layer;
        steps.push(new Step('Choose batch time',
            new WidgetDef('st-bt-wiz-layer', wizScope),
            null,
            true,
            null,
            function (success) {
                if (success) {
                    alert("Done");
                    layer = $rootScope.grizzlyBearScope.workspaces.analysis[0];
                    layer.cqlFilter = 'cellId == 1';
                }
            })
        );

        var wiz = new Wizard('Grizzly-Bear Batch Time', 'fa-sort-amount-asc', 'fa-check text-success', steps, wizScope, 'btWizardForm');
        wizardManager.launchWizard(wiz);
    };
}])

.directive('stBtWizLayer',
function () {
    return {
        restrict: 'E',
        templateUrl: 'grizzlybear/wizard/templates/source.tpl.html'
    };
})
;
