angular.module('stealth.playback.playback', [
    'stealth.common.map.leaflet.map'
])

.config(['$routeProvider',
    function($routeProvider) {
        $routeProvider.when('/playback', {
            templateUrl: 'playback/playback.tpl.html'
        });
    }
])

;
