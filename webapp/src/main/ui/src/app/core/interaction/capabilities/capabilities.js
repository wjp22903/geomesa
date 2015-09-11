angular.module('stealth.core.interaction.capabilities', [
    'ui.bootstrap'
])

.factory('stealth.core.interaction.capabilities.Extender', [
function () {
    var Extender = function () {
        var _capabilitiesExtenders = [];
        this.extendCapabilities = function (capabilities, thisArg, opts) {
            _.each(_capabilitiesExtenders, function (extender) {
                if (_.isFunction(extender)) {
                    capabilities = extender.call(thisArg, capabilities, opts);
                } else if (_.isObject(extender) && _.isFunction(extender.extendCapabilities)) {
                    capabilities = extender.extendCapabilities.call(thisArg, capabilities, opts);
                }
            });
            return capabilities;
        };
        this.addCapabilitiesExtender = function (extender) {
            _capabilitiesExtenders.push(extender);
        };
    };

    return Extender;
}])

.service('coreCapabilitiesExtender', [
'$rootScope',
'$modal',
'$interpolate',
'$window',
'stealth.core.interaction.capabilities.Extender',
function ($rootScope, $modal, $interpolate, $window, Extender) {
    Extender.apply(this);

    //Let's add some built-in extenders
    this.addCapabilitiesExtender(function (capabilities) {
        if (!_.isUndefined(capabilities['view'])) {
            _.forOwn(capabilities['view'], function (value, key) {
                if (_.isString(value)) {
                    capabilities['view:' + value] = {
                        toolTipText: 'View ' + key,
                        iconClass: 'fa-file-text-o',
                        onClick: function (name, record) { //eslint-disable-line no-unused-vars
                            var viewScope = $rootScope.$new();
                            viewScope.title = key;
                            viewScope.value = _.map(value.split(','), function (field) {
                                return record[field];
                            }).join('\n');
                            $modal.open({
                                size: 'lg',
                                scope: viewScope,
                                templateUrl: 'core/interaction/fieldview.tpl.html',
                                controller: 'fieldViewController',
                                backdrop: 'static',
                                backdropClass: 'wizardMask'
                            });
                        }
                    };
                }
            });
        }
        return capabilities;
    });

    // add external links if needed.
    this.addCapabilitiesExtender(function (capabilities) {
        if (_.isObject(capabilities['link'])) {
            if (_.isEmpty(capabilities['link']['url'])) {
                delete capabilities['link'];
            } else {
                capabilities['link']['toolTipText'] = capabilities['link']['toolTipText'] || 'Link';
                capabilities['link']['url']         = capabilities['link']['url'] || '';
                capabilities['link']['iconClass']   = capabilities['link']['iconClass'] || 'fa-external-link';
                capabilities['link']['onClick']     = function (name, record, capability) { //eslint-disable-line no-unused-vars
                    var searchTemplate = capability['url'];
                    if (_.size(searchTemplate) > 0) {
                        var interpExp = $interpolate(searchTemplate);
                        var url = interpExp(record);
                        $window.open(url);
                    }
                };
            }
        }
        return capabilities;
    });
}])
;
