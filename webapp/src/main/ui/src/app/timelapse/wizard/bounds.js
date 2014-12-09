angular.module('stealth.timelapse.wizard.bounds', [
    'stealth.core.geo.ol3.map',
    'stealth.core.utils',
    'stealth.core.wizard'
])

.factory('boundTlWizFactory', [
'stealth.core.utils.WidgetDef',
'stealth.core.wizard.Step',
'stealth.core.wizard.Wizard',
function (WidgetDef, Step, Wizard) {
    var self = {
        createBoundsWiz: function (wizardScope) {
            if(!wizardScope.bounds) {
                wizardScope.bounds = {
                    minLon: null,
                    minLat: null,
                    maxLon: null,
                    maxLat: null
                };
            }
            return new Wizard(null, null, null, [
                new Step('Select Bounds',
                         new WidgetDef('st-tl-wiz-bounds', wizardScope, 'bounds="bounds"'),
                         null, false, _.noop, function () { wizardScope.$destroy(); })
            ]);
        }
    };
    return self;
}])

.controller('boundWizController', [
'$scope',
'$filter',
'ol3Map',
'wizardManager',
function ($scope, $filter, ol3Map, wizManager) {
    var _draw = new ol.interaction.DragBox({
        style: new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: [204, 0, 153, 1]
            }),
            fill: new ol.style.Fill({
                color: [204, 0, 153, 0.5]
            })
        })
    });
    _draw.on('boxend', function () {
        $scope.$apply(function () {
            _checkAndSetBounds(_draw.getGeometry().getExtent());
            ol3Map.removeInteraction(_draw);
            $scope.drawing = false;
            wizManager.showFooter();
        });
    });

    var _checkAndSetBounds = function (extent) {
        var filter = $filter('number');
        var trimmed = _.map(extent, function (val) {
            return parseFloat(filter(val, 5));
        });
        $scope.bounds.minLon = trimmed[0] < -180 ? -180 : trimmed[0];
        $scope.bounds.minLat = trimmed[1] < -90 ? -90 : trimmed[1];
        $scope.bounds.maxLon = trimmed[2] > 180 ? 180 : trimmed[2];
        $scope.bounds.maxLat = trimmed[3] > 90 ? 90 : trimmed[3];
    };

    $scope.$on('$destroy', function () {
        ol3Map.removeInteraction(_draw);
    });

    $scope.drawing = false;

    $scope.setWholeEarth = function () {
        _checkAndSetBounds([-180, -90, 180, 90]);
    };

    $scope.setMapExtent = function () {
        _checkAndSetBounds(ol3Map.getExtent());
    };

    $scope.drawExtent = function () {
        $scope.drawing = true;
        wizManager.hideFooter();
        ol3Map.addInteraction(_draw);
    };
}])

.directive('stTlWizBounds',
function () {
    return {
        restrict: 'E',
        templateUrl: 'timelapse/wizard/templates/bounds.tpl.html',
        scope: { bounds: '=' },
        controller: 'boundWizController'
    };
})
;
