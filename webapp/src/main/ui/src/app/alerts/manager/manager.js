angular.module('stealth.alerts.manager', [
    'stealth.core.geo.ol3.format',
    'stealth.core.geo.ol3.layers',
    'stealth.core.geo.ol3.map',
    'stealth.core.geo.ol3.overlays',
    'stealth.core.geo.ol3.style',
    'stealth.core.geo.ows',
    'stealth.core.utils'
])

.service('alertsManager', [
'$rootScope',
'$timeout',
'colors',
'ol3Styles',
'ol3Map',
'owsLayers',
'stealth.core.utils.WidgetDef',
'stealth.core.geo.ol3.format.GeoJson',
'stealth.core.geo.ol3.layers.PollingGeoJsonVectorLayer',
'stealth.core.geo.ol3.overlays.HighlightLayer',
function ($rootScope, $timeout, colors, ol3Styles, ol3Map, owsLayers,
          WidgetDef, GeoJson, PollingGeoJsonVectorLayer, HighlightLayer) {
    var _self = this;
    var _parser = new GeoJson();
    var _alertsIcon = 'fa fa-fw fa-lg fa-exclamation-triangle';
    var _workspaces = {};
    var _alerts = [];
    var _selectedAlert = {
        feature: undefined,
        layer: undefined,
        record: undefined,
        trackEnded: false
    };
    var _findAlert = function (layer, feature) {
        return _.find(_alerts, function (a) {
            return (a.layer === layer && a.feature === feature);
        });
    };
    var _highlightLayer = new HighlightLayer({
        colors: ['#ff0000'],
        styleBuilder: function (color) {
            var rgbColor = 'rgba(' + colors.hexStringToRgbArray(color).join(',') + ',0.5)';
            return new ol.style.Style({
                image: new ol.style.Circle({
                    fill: new ol.style.Fill({color: rgbColor}),
                    radius: 10,
                    stroke: new ol.style.Stroke({
                        color: color,
                        width: 2
                    })
                })
            });
        }
    });

    var keywordPrefix = 'alerts';
    owsLayers.getLayers(keywordPrefix)
    .then(function (layers) {
        _.each(layers, function (l) {
            _.each(_.get(l.KeywordConfig, keywordPrefix), function (conf, workspace) {
                var layer = _.cloneDeep(l);
                var pollingOptions = {
                    name: layer.Title,
                    layerThisBelongsTo: layer,
                    zIndexHint: 6,
                    queryable: true,
                    preventInitialPolling: true
                };
                if (_.has(layer.KeywordConfig, [keywordPrefix, workspace, 'field', 'history'])) {
                    var historyField = _.get(layer.KeywordConfig, [keywordPrefix, workspace, 'field', 'history']);
                    pollingOptions.extraStyleBuilder = function (size, color) {
                        var lineStyle = ol3Styles.getLineStyle(size, color);
                        lineStyle.setGeometry(function (feature) {
                            return _parser.readGeometry(feature.get(historyField));
                        });
                        var startStyle = new ol.style.Style({
                            image: new ol.style.RegularShape({
                                fill: new ol.style.Fill({color: color}),
                                points: 3,
                                radius: size,
                                stroke: new ol.style.Stroke({
                                    color: '#ffffff',
                                    width: 1
                                })
                            }),
                            geometry: function (feature) {
                                var point = _parser.readGeometry(feature.get(historyField)).getLastCoordinate();
                                return new ol.geom.Point(point);
                            }
                        });
                        return [lineStyle, startStyle];
                    };
                }
                layer.alertState = {
                    toggledOn: false,
                    isVisible: true
                };
                layer.getTooltip = function () {
                    if (layer.viewState.isOnMap) {
                        return 'Remove from map';
                    }
                    return 'Add to map';
                };
                layer.pollingLayer = new PollingGeoJsonVectorLayer(pollingOptions);
                layer.pollingLayer.buildSearchPointWidgetsForResponse = function (response, parentScope) {
                    if (response.isError ||
                        !_.isArray(response.records) ||
                        _.isEmpty(response.records)) {
                        return null;
                    } else {
                        return _.map(response.records, function (record, index) {
                            var s = (parentScope || $rootScope).$new();
                            var feature = response.features[index];
                            var alert = _findAlert(layer, feature);
                            s.name = response.name;
                            s.capabilities = response.capabilities;
                            s.record = alert.record;
                            s.trackended = alert.trackEnded;
                            return {
                                level: _.padLeft(layer.pollingLayer.reverseZIndex, 4, '0') + '_' + _.padLeft(index, 4, '0'),
                                iconClass: layer.pollingLayer.styleDirectiveScope.styleVars.iconClass,
                                tooltipText: s.name,
                                widgetDef: new WidgetDef('st-live-air-wms-layer-popup', s,
                                    "name='name' capabilities='capabilities' record='record' trackended=trackended"),
                                onTabFocus: function () {
                                    var alert = _findAlert(layer, feature);
                                    if (alert) {
                                        $rootScope.$applyAsync(function () {
                                            _self.selectAlert(alert);
                                        });
                                    }
                                }
                            };
                        });
                    }
                };
                layer.pollingLayer.getSource().on('addfeature', function (event) {
                    var alert = {
                        feature: event.feature,
                        record: event.feature.getProperties(),
                        layer: layer,
                        isNew: true,
                        trackEnded: false
                    };
                    _alerts.unshift(alert);
                    $timeout(function () { alert.isNew = false; }, 10000);
                });
                layer.pollingLayer.getSource().on('removefeature', function (event) {
                    var alert = _findAlert(layer, event.feature);
                    alert.trackEnded = true;
                    if (_self.isSelected(alert)) {
                        _selectedAlert.trackEnded = true;
                    }
                    _.pull(_alerts, alert);
                });
                layer.pollingLayer.getSource().on('changefeature', function (event) {
                    var alert = _findAlert(layer, event.feature);
                    $rootScope.$applyAsync(function () {
                        _.merge(alert.record, event.feature.getProperties());
                    });
                });
                layer.pollingLayer.getOl3Layer().on('change:visible', function () {
                    layer.alertState.isVisible = layer.pollingLayer.getOl3Layer().getVisible();
                    if (layer === _selectedAlert.layer) {
                        if (layer.alertState.isVisible) {
                            _highlightLayer.addFeature(_selectedAlert.feature);
                        } else {
                            _highlightLayer.removeFeature(_selectedAlert.feature);
                        }
                    }
                });
                layer.pollingLayer.styleDirectiveScope.styleVars.iconClass = _alertsIcon;
                layer.pollingLayer.styleDirectiveScope.removeLayer = function () {
                    layer.alertState.toggledOn = false;
                    _self.toggleLayerAlerts(layer);
                };
                if (_.isArray(_workspaces[workspace])) {
                    _workspaces[workspace].push(layer);
                } else {
                    _workspaces[workspace] = [layer];
                }
            });
        });
    });

    _self.getWorkspaces = function () {
        return _workspaces;
    };

    _self.getAlerts = function () {
        return _alerts;
    };

    _self.getSelectedAlert = function () {
        return _selectedAlert;
    };

    _self.isSelected = function (alert) {
        return (_selectedAlert.layer === alert.layer && _selectedAlert.feature === alert.feature);
    };

    _self.clearHighlight = function () {
        if (!_.isUndefined(_selectedAlert.feature)) {
            _highlightLayer.removeFeature(_selectedAlert.feature);
        }
    };

    _self.selectAlert = function (alert) {
        _self.clearHighlight();
        if (alert.layer.alertState.isVisible) {
            _highlightLayer.addFeature(alert.feature);
        }
        _selectedAlert.feature = alert.feature;
        _selectedAlert.layer = alert.layer;
        _selectedAlert.record = alert.record;
        _selectedAlert.trackEnded = alert.trackEnded;
    };

    _self.deselectAlert = function () {
        _self.clearHighlight();
        _selectedAlert.feature = undefined;
        _selectedAlert.layer = undefined;
        _selectedAlert.record = undefined;
        _selectedAlert.trackEnded = false;
    };

    _self.toggleLayerAlerts = function (layer) {
        var pollingLayer = layer.pollingLayer;
        if (layer.alertState.toggledOn) {
            ol3Map.addLayer(pollingLayer);
            pollingLayer.refresh();
            pollingLayer.startPolling();
        } else {
            ol3Map.removeLayerById(pollingLayer.id);
            pollingLayer.cancelPolling();
            if (_selectedAlert.layer === layer) {
                _self.deselectAlert();
            }
        }
    };
}])
;
