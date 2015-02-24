angular.module('stealth.targetpri.wizard')

.directive('stTpWizData', [
'$log',
'$filter',
'wms',
'CONFIG',
function ($log, $filter, wms, CONFIG) {
    return {
        restrict: 'E',
        replace: true,
        templateUrl: 'targetpri/wizard/templates/data.tpl.html',
        controller: ['$scope', function ($scope) {
            $scope.loadError = false;
            var keywordPrefix = CONFIG.app.context + '.targetpri.data';
            if (_.isUndefined($scope.layers)) {
                wms.getCapabilities(CONFIG.geoserver.defaultUrl, CONFIG.geoserver.omitProxy)
                    .then(function (wmsCap) {
                        $scope.layers = [];
                        _.each(wmsCap.Capability.Layer.Layer, function (l) {
                            _.each(l.KeywordList, function (keyword) {
                                if (keyword.indexOf(keywordPrefix) === 0) {
                                    var layer = _.cloneDeep(l);
                                    layer.isSelected = false;
                                    _.merge(layer, {idField: 'id', dtgField: 'dtg'},
                                        angular.fromJson($filter('splitLimit')(keyword, '=', 1)[1]));
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
