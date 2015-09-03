angular.module('stealth.core.geo.ol3.interaction')

.service('stealth.core.geo.ol3.interaction.standard', [
'stealth.core.utils.keyboard',
function (keyboard) {
    /**
     * Get a standard Modify interaction.
     *
     * @param {ol.Collection<ol.Feature>} features - Collection of features to
     *     modify
     *
     * @returns {ol.interaction.Modify}
     */
    this.getModify = function (features) {
        var modify = new ol.interaction.Modify({
            features: features,
            //require DELETE key to delete vertices
            deleteCondition: function (event) {
                return keyboard.isDown([46], true) &&
                    ol.events.condition.singleClick(event);
            }
        });
        modify.on('change:active', function () {
            if (modify.getActive()) {
                keyboard.listen();
            } else {
                keyboard.unlisten();
            }
        });
        return modify;
    };
}])
;
