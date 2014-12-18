angular.module('stealth.timelapse.wizard.options', [
    'stealth.core.utils',
    'stealth.core.wizard',
    'stealth.timelapse.wizard.query'
])

.factory('optionTlWizFactory', [
'queryService',
'stealth.core.utils.WidgetDef',
'stealth.core.wizard.Step',
'stealth.core.wizard.Wizard',
'stealth.timelapse.wizard.Query',
function (queryService, WidgetDef, Step, Wizard, Query) {
    var self = {
        createQueryOptionWiz: function (wizardScope) {
            if (!wizardScope.query) {
                wizardScope.query = new Query();
            }

            var submitQuery = function (stepNum, success) {
                if (success) {
                    queryService.launchBinQuery(this.getWizardScope().query);
                }
            };

            return new Wizard(null, null, null, [
                new Step('Select Query Type', new WidgetDef('st-tl-wiz-query-type', wizardScope), null, true, _.noop, _.noop),
                new Step('Query Options', new WidgetDef('st-tl-wiz-query-options', wizardScope), null, true, _.noop, submitQuery)
            ]);
        }
    };
    return self;
}])

.directive('stTlWizQueryType',
function () {
    return {
        restrict: 'E',
        templateUrl: 'timelapse/wizard/templates/querytype.tpl.html'
    };
})

.directive('stTlWizQueryOptions',
function () {
    return {
        restrict: 'E',
        templateUrl: 'timelapse/wizard/templates/queryoptions.tpl.html'
    };
})

/* Work-around for bootstrap datepicker not initially formatting date values
 * when running with angular 1.3.
 * https://github.com/angular-ui/bootstrap/issues/2659
 */
.directive('datepickerPopup', function (){
  return {
    restrict: 'EAC',
    require: 'ngModel',
    link: function(scope, element, attr, controller) {
      //remove the default formatter from the input directive to prevent conflict
      controller.$formatters.shift();
    }
  };
})
;
