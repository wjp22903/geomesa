angular.module('stealth.targetpri.wizard')

.directive('stTpWizData', [
'owsLayers',
function (owsLayers) {
    return {
        restrict: 'E',
        replace: true,
        templateUrl: 'targetpri/wizard/templates/data.tpl.html',
        controller: ['$scope', function ($scope) {
            $scope.loadError = false;
            if (_.isUndefined($scope.layers)) {
                var keywordPrefix = ['targetpri', 'data'];
                owsLayers.getLayers(keywordPrefix)
                    .then(function (layers) {
                        $scope.layers = [];
                        _.each(layers, function (l) {
                            var layer = _.cloneDeep(l);
                            layer.isSelected = false;
                            _.each(_.keys(_.get(layer.KeywordConfig, keywordPrefix)), function (workspace) {
                                layer.fieldNames = _.merge({
                                    id: 'id',
                                    dtg: 'dtg'
                                }, _.get(layer.KeywordConfig, keywordPrefix.concat([workspace, 'field'])));
                            });
                            $scope.layers.push(layer);
                        });
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
