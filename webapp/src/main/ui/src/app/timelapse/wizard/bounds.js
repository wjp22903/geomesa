angular.module('stealth.timelapse.wizard.bounds', [
    'stealth.core.geo.ol3.map',
    'stealth.core.utils',
    'stealth.core.wizard',
    'stealth.timelapse.wizard.query'
])

.factory('boundTlWizFactory', [
'stealth.core.utils.WidgetDef',
'stealth.core.wizard.Step',
'stealth.core.wizard.Wizard',
'stealth.timelapse.wizard.Query',
function (WidgetDef, Step, Wizard, Query) {
    var self = {
        createBoundWiz: function (wizardScope) {
            if (!wizardScope.query) {
                wizardScope.query = new Query();
            }
            return new Wizard(null, null, null, [
                new Step('Define search area', new WidgetDef('st-tl-wiz-bounds', wizardScope))
            ]);
        }
    };
    return self;
}])

.controller('boundWizController', [
'$scope',
'ol3Map',
'wizardManager',
function ($scope, ol3Map, wizManager) {
    var _draw = new ol.interaction.DragBox();
    _draw.on('boxend', function () {
        $scope.$apply(function () {
            $scope.query.checkAndSetBounds(_draw.getGeometry().getExtent());
            ol3Map.removeInteraction(_draw);
            $scope.boundWiz.drawing = false;
            wizManager.showFooter();
        });
    });

    if (!$scope.boundWiz) {
        $scope.boundWiz = {
            drawing: false,
            setWholeEarth: function () {
                $scope.query.checkAndSetBounds([-180, -90, 180, 90]);
            },
            setMapExtent: function () {
                $scope.query.checkAndSetBounds(ol3Map.getExtent());
            },
            drawExtent: function () {
                $scope.boundWiz.drawing = true;
                wizManager.hideFooter();
                ol3Map.addInteraction(_draw);
            }
        };
    }

    $scope.$on('$destroy', function () {
        ol3Map.removeInteraction(_draw);
    });
}])

.directive('stTlWizBounds',
function () {
    return {
        restrict: 'E',
        templateUrl: 'timelapse/wizard/templates/bounds.tpl.html',
        controller: 'boundWizController'
    };
})
;
