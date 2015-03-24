angular.module('stealth.core.manager')

.service('moduleManager', [
'$log',
'$injector',
function ($log, $injector) {
    var tag = 'stealth.core.manager.moduleManager: ';
    this.moduleRegistered = function (moduleName) {
        $log.debug(tag + 'Looking for module: ' + moduleName);
        return angular.moduleRegistered(moduleName);
    };

    this.findModuleService = function (moduleName, serviceName, caller) {
        var serviceInstance;
        $log.debug(tag + 'Searching for service instance for ' + caller);
        if (angular.moduleRegistered(moduleName)) {
            $log.debug(tag + 'Service search found ' + moduleName);
            if ($injector.has(serviceName)) {
                $log.debug(tag + 'Service search found ' + serviceName);
                serviceInstance = $injector.get(serviceName, caller);
            }
        }
        return serviceInstance;
    };
}])
;
