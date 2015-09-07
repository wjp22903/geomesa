angular.module('stealth.crawl', [
    'stealth.core.popup.capabilities'
])

.run([
'coreCapabilitiesExtender',
function (coreCapabilitiesExtender) {
    coreCapabilitiesExtender.addCapabilitiesExtender(function (capabilities) {
        if (!_.isUndefined(capabilities['crawl'])) {
            capabilities['crawl'].toolTipText = 'View Entity Info';
            capabilities['crawl'].iconClass = 'fa-sitemap';
            capabilities['crawl'].onClick = function (name, record, capability) {
                console.log(name, record, capability);
            };
        }
        return capabilities;
    });
}]);
