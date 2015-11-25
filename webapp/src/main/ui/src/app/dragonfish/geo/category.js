angular.module('stealth.dragonfish.geo.category', [
    'stealth.core.geo.analysis.category',
    'stealth.dragonfish.geo.ol3.layers'
])

.service('stealth.dragonfish.geo.category.manager', [
'categoryManager',
'stealth.dragonfish.geo.category.ImageCategory',
'stealth.dragonfish.geo.ol3.layers.DragonTileLayer',
function (categoryManager, ImageCategory, DragonTileLayer) {
    var _category = null;

    this.addImageLayerFromImageId = function (imageId) {
        return this.addImageLayer(new DragonTileLayer({
            imageId: imageId
        }));
    };

    this.addImageLayer = function (layer) {
        //Don't allow duplicates
        if (_category) {
            var found = _.find(_category.getLayers(), function (catLayer) {
                return _.isFunction(catLayer.getImageId) &&
                    catLayer.getImageId() === layer.getImageId();
            });
            if (found) {
                found.getOl3Layer().setVisible(true);
                return found;
            }
        } else {
            _category = categoryManager.addCategory(2, new ImageCategory(function () {
                _category = null;
            }));
        }
        return _category.addLayer(layer);
    };

    this.removeImageLayer = function (layer) {
        if (_category) {
            _category.removeLayer(layer);
        } else {
            throw new Error('DF Image Category should exist');
        }
    };
}])

.factory('stealth.dragonfish.geo.category.ImageCategory', [
'stealth.core.geo.analysis.category.AnalysisCategory',
'stealth.dragonfish.geo.ol3.layers.DragonTileConstant',
function (AnalysisCategory, DTC) {
    var Category = function (onClose) {
        AnalysisCategory.apply(this, [DTC.title, DTC.icon, onClose]);
    };
    Category.prototype = Object.create(AnalysisCategory.prototype);
    return Category;
}])
;
