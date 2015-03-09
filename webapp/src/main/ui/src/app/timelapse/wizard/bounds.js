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
                new Step('Define search area', new WidgetDef('st-tl-wiz-bounds', wizardScope), null, false, _.noop, _.noop)
            ]);
        }
    };
    return self;
}])

.controller('boundWizController', [
'$scope',
'$filter',
'ol3Map',
'ol3Styles',
'wizardManager',
function ($scope, $filter, ol3Map, ol3Styles, wizManager) {
    var _draw = new ol.interaction.DragBox({
        style: ol3Styles.getPolyStyle(1, '#CC0099')
    });
    _draw.on('boxend', function () {
        $scope.$apply(function () {
            _checkAndSetBounds(_draw.getGeometry().getExtent());
            ol3Map.removeInteraction(_draw);
            $scope.boundWiz.drawing = false;
            wizManager.showFooter();
        });
    });

    var _checkAndSetBounds = function (extent) {
        var filter = $filter('number');
        var trimmed = _.map(extent, function (val) {
            return parseFloat(filter(val, 5));
        });
        $scope.query.params.minLon = trimmed[0] < -180 ? -180 : trimmed[0];
        $scope.query.params.minLat = trimmed[1] < -90 ? -90 : trimmed[1];
        $scope.query.params.maxLon = trimmed[2] > 180 ? 180 : trimmed[2];
        $scope.query.params.maxLat = trimmed[3] > 90 ? 90 : trimmed[3];
    };

    if (!$scope.boundWiz) {
        $scope.boundWiz = {
            drawing: false,
            setWholeEarth: function () {
                _checkAndSetBounds([-180, -90, 180, 90]);
            },
            setMapExtent: function () {
                _checkAndSetBounds(ol3Map.getExtent());
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
