angular.module('stealth.common.map.ol.popup.popup', [
    'stealth.common.utils',
    'stealth.ows.ows'
])
    .directive('openlayersPopup', [
        '$rootScope', '$filter', '$timeout', '$modal', 'Utils', 'CONFIG',
        function ($rootScope, $filter, $timeout, $modal, Utils, CONFIG) {
            return {
                require: '^openlayersMap',
                restrict: 'E',
                link: function (scope, element, attrs, mapCtrl) {
                    var map = mapCtrl.getMap(),
                        button = new OpenLayers.Control.Button({
                            type: OpenLayers.Control.TYPE_TOOL,
                            designation: 'popup',
                            displayClass: 'openlayersPopup',
                            title: 'Get Info',
                            eventListeners: {
                                activate: function () {
                                    _.each(map.getControlsByClass('OpenLayers.Control.WMSGetFeatureInfo'), function (getInfo) {
                                        getInfo.activate();
                                    });
                                },
                                deactivate: function () {
                                    _.each(map.getControlsByClass('OpenLayers.Control.WMSGetFeatureInfo'), function (getInfo) {
                                        getInfo.deactivate();
                                    });
                                }
                            }
                        });
                    _.each(map.getControlsBy('designation', 'toolbar'), function (toolbar) {
                        toolbar.addControls([button]);
                        toolbar.activateControl(button);  //active by default
                    });

                    scope.mapPopup = {
                        list: {
                            currentPage: 1,
                            pageSize: 10,
                            numberOfPages: function () {
                                if (scope.mapPopup.features) {
                                    return Math.ceil(scope.mapPopup.features.length/scope.mapPopup.list.pageSize);
                                }
                                return 0;
                            }
                        },
                        showWindow: function () {
                            if (!scope.mapPopup.open) {
                                scope.mapPopup.list.currentPage = 1;
                                var mp = $modal.open({
                                    scope: scope,
                                    backdrop: 'static',
                                    size: 'lg',
                                    templateUrl: 'common/map/ol/popup/popup.tpl.html',
                                    controller: function ($scope, $modalInstance) {
                                        $scope.modal = {
                                            cancel: function () {
                                                $modalInstance.dismiss('cancel');
                                            }
                                        };
                                    }
                                });
                                mp.opened.then(function () {
                                    scope.mapPopup.open = true;
                                });
                                mp.result["finally"](function () { // To satisfy Fortify.
                                    scope.mapPopup.open = false;
                                    delete scope.mapPopup.features;
                                });
                            }
                        },
                        showHistory: function (idField, props, curLayerUrl, curDataLayer) {
                            showHistory(curLayerUrl.replace(new RegExp('^cors\/'), ''), idField, props[idField], curDataLayer);
                        },
                        sendToComention: function (idField, props) {
                            window.open(CONFIG.comention.url + '?name=' + props[idField], '_blank').focus();
                        }
                    };

                    function showHistory (url, idField, idValue, layerCsv) {
                        map.raiseLayer(mapCtrl.replaceWmsLayers([idValue], {
                            name: idValue,
                            url: url,
                            cql_filter: idField + " = '" + idValue + "'",
                            layers: layerCsv,
                            styles: 'stealth_dataPoints',
                            env: 'color:' + Utils.getBrightColor().substring(1)
                        }), -1);
                        map.raiseLayer(mapCtrl.replaceWmsLayers([idValue + '_heatmap'], {
                            name: idValue + '_heatmap',
                            url: url,
                            cql_filter: idField + " = '" + idValue + "'",
                            layers: layerCsv,
                            styles: 'stealth_heatmap',
                            dontShow: true
                        }), -1);
                    }
                    function addGetInfoControl(layer, layerConfig) {
                        var ctrl = new OpenLayers.Control.WMSGetFeatureInfo({
                            autoActivate: _.every(map.getControlsBy('designation', 'popup'), function (navCtrl) {
                                return navCtrl.active;
                            }),
                            url: $filter('endpoint')(layerConfig.url, 'wms'),
                            layers: [layer],
                            layerUrls: [layerConfig.url],
                            vendorParams: layerConfig,
                            infoFormat: 'application/json',
                            maxFeatures: 100,
                            queryVisible: true
                        });
                        ctrl.events.register("getfeatureinfo", null, function (evt) {
                            $timeout(function () {
                                try {
                                    var newFeatures = JSON.parse(evt.text).features;
                                    if (!_.isEmpty(newFeatures) && _.isArray(newFeatures)) {
                                        _.each(newFeatures, function (newFeature) {
                                            newFeature.curLayer = evt.object.layers[0];
                                            var layers = newFeature.curLayer.params.LAYERS || newFeature.curLayer.params.layers,
                                                name = _.isArray(layers) ? layers[0] : layers;
                                            newFeature.curDataLayer = name.toString().replace(/.*proximity_[0-9a-z]*_(\w*)___(\w)/, "$1:$2");
                                            newFeature.targetDataSource = CONFIG.dataSources.targets[newFeature.curDataLayer];
                                            newFeature.siteDataSource = CONFIG.dataSources.sites[newFeature.curDataLayer];
                                        });
                                        if (_.isArray(scope.mapPopup.features)) {
                                            scope.mapPopup.features = scope.mapPopup.features.concat(newFeatures);
                                        } else {
                                            scope.mapPopup.features = newFeatures;
                                        }
                                        if (!_.isEmpty(scope.mapPopup.features)) {
                                            scope.mapPopup.showWindow();
                                        }
                                    }
                                } catch (e) {
                                    //fail silently, for now
                                    console.log(e.message);
                                }
                            });
                        });
                        map.addControl(ctrl);
                        layer.events.register('removed', null, function (evt) {
                            ctrl.destroy();
                        });
                    }
                    $rootScope.$on('AddGetInfoControl', function (event, layer, config) {
                        addGetInfoControl(layer, config);
                    });
                    $rootScope.$on('ShowTargetHistory', function (event, url, idField, idValue, layerCsv) {
                        showHistory(url, idField, idValue, _.isArray(layerCsv) ? layerCsv.join(',') : layerCsv);
                    });
                }
            };
        }
    ])
;
