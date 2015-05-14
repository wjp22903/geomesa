angular.module('stealth.crawl')

.run([
'coreCapabilitiesExtender',
function (coreCapabilitiesExtender) {
    coreCapabilitiesExtender.addCapabilitiesExtender(function (capabilities, opts) {
        if (!_.isUndefined(capabilities['crawl'])) {
            capabilities['crawl'].toolTipText = 'View Entity Info';
            capabilities['crawl'].iconClass = 'fa-sitemap';
            capabilities['crawl'].onClick = function (name, record, capability) {
                var x = 42;
            };
        }
        return capabilities;
    });
}]);
