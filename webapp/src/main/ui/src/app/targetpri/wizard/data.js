angular.module('stealth.targetpri.wizard')

.directive('stTpWizData', [
'$log',
'wms',
'CONFIG',
function ($log, wms, CONFIG) {
    return {
        restrict: 'E',
        replace: true,
        templateUrl: 'targetpri/wizard/templates/data.tpl.html',
        controller: ['$scope', function ($scope) {
            $scope.loadError = false;
            if (_.isUndefined($scope.layers)) {
                wms.getCapabilities(CONFIG.geoserver.defaultUrl, CONFIG.geoserver.omitProxy)
                    .then(function (wmsCap) {
                        $scope.layers = [];
                        _.each(wmsCap.Capability.Layer.Layer, function (l) {
                            _.each(l.KeywordList, function (keyword) {
                                var keywordParts = keyword.split('.');
                                if (keywordParts.length > 2 && keywordParts[0] === CONFIG.app.context &&
                                        keywordParts[1] === 'targetpri' && keywordParts[2].indexOf('data=') === 0) {
                                    var layer = _.cloneDeep(l);
                                    layer.isSelected = false;
                                    layer.idField = keywordParts[2].substring(5);
                                    $scope.layers.push(layer);
                                    return false;
                                }
                            });
                        });
                    }, function () {
                        $scope.loadError = true;
                    });
            }
            $scope.toggleLayer = function (layer) {
                layer.isSelected = !layer.isSelected;
                if (layer.isSelected) {
                    $scope.datasources.push(layer);
                } else {
                    _.pull($scope.datasources, layer);
                }
            };
            $scope.$watch('datasources | lodash:"isEmpty"', function (newVal) {
                $scope.wizardForm.$setValidity('datasources', !newVal);
            });
        }]
    };
}])
;
