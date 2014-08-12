angular.module('stealth.airdomain.airDomain',[
    'stealth.common.map.leaflet.leafletMap'
])
    .config(['$routeProvider',
        function($routeProvider) {
            $routeProvider.when('/airDomain', {
                templateUrl: 'airdomain/airDomain.tpl.html'
            });
        }
    ])
    .controller('AirDomainController',
    ['$scope', 'CONFIG', function($scope, CONFIG) {
        atmosphere.subscribe({
            url: CONFIG.app.contextPath + '/tracks/realtime',
            contentType: 'application/json',
            transport: 'websocket',
            reconnectInterval: 5000,
            enableXDR: true,
            timeout: 60000,
            onMessage: function(response) {
                var message = atmosphere.util.parseJSON(response.responseBody);
                $scope.$emit('new track', message);
            }
        });
    }])
;
