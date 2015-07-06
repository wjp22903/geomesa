angular.module('stealth.core.geo.ol3.follow', [
    'stealth.core.geo.ol3.map'
])

.service('mapFollowManager', [
'ol3Map',
function (ol3Map) {
    var _mapView = ol3Map.getView();
    var _activeFollow = false;
    var _feature;
    var _cancelCallback;
    var _onGeometryChange = function () {
        _mapView.setCenter(ol.extent.getCenter(_feature.getGeometry().getExtent()));
    };
    var _panInteractions = _.filter(ol3Map.getInteractions().getArray(), function (interaction) {
        return (interaction instanceof ol.interaction.DragPan || interaction instanceof ol.interaction.KeyboardPan);
    });

    this.followFeature = function (feature, cancelCallback) {
        if (_activeFollow && !_.isUndefined(_feature)) {
            _feature.un('change:geometry', _onGeometryChange);
            if (_.isFunction(_cancelCallback)) {
                _cancelCallback();
            }
        } else if (!_activeFollow) {
            _.each(_panInteractions, function (interaction) {
                ol3Map.removeInteraction(interaction);
            });
        }
        _feature = feature;
        _cancelCallback = cancelCallback;
        _activeFollow = true;
        _onGeometryChange();
        _feature.on('change:geometry', _onGeometryChange);
    };

    this.stopFollowingFeature = function (feature) {
        if (_feature === feature) {
            _.each(_panInteractions, function (interaction) {
                ol3Map.addInteraction(interaction);
            });
            _feature.un('change:geometry', _onGeometryChange);
            _activeFollow = false;
        }
    };
}])
;
