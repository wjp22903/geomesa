angular.module('stealth.core.interaction.capabilities')

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
'stealth.core.interaction.capabilities.Extender',
function ($rootScope, $modal, Extender) {
    Extender.apply(this);

    //Let's add some built-in extenders
    this.addCapabilitiesExtender(function (capabilities, opts) {
        if (!_.isUndefined(capabilities['view'])) {
            _.forOwn(capabilities['view'], function (value, key) {
                if (_.isString(value)) {
                    capabilities['view:' + value] = {
                        toolTipText: 'View ' + key,
                        iconClass: 'fa-file-text-o',
                        onClick: function (name, record, capability) {
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
}])
;
