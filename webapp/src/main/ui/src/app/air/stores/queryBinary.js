angular.module('stealth.air.stores')

.factory('stealth.air.stores.QueryBinStoreConstructorFactory', [
function () {
    return {
        getConstructor: function (QueryBinStore) {
            var AirQueryBinStore = function (/* inherited */) {
                var _self = this;
                QueryBinStore.apply(this, arguments);

                var searchPointAndTime = this.searchPointAndTime;
                this.searchPointAndTime = function (/* inherited */) {
                    return searchPointAndTime.apply(this, arguments)
                        .then(function (response) {
                            //If this is an "air" layer, add a special identifier to each record.
                            if (_.deepGet(_self.getQuery().layerData.currentLayer.KeywordConfig, 'air.historical')) {
                                response.stealthType = 'stealth.air';
                            }
                            return response;
                        });
                };
            };
            AirQueryBinStore.prototype = Object.create(QueryBinStore.prototype);

            return AirQueryBinStore;
        }
    };
}])
;