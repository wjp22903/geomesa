angular.module('stealth.histogram.geo', [
    'stealth.histogram.geo.ol3.layers',
    'stealth.histogram.wizard'
])

.run([
'$log',
'$rootScope',
'$timeout',
'ol3Map',
'wms',
'wfs',
'owsLayers',
'categoryManager',
'tlControlsManager',  //TODO: remove coupling to timelapse plugin
'histogramQueryService',
'histogramWizard',
'histogramBuilder',
'stealth.core.geo.ol3.manager.Category',
'stealth.core.utils.WidgetDef',
'stealth.core.geo.ol3.layers.MapLayer',
'CONFIG',
function ($log, $rootScope, $timeout,
          ol3Map, wms, wfs, owsLayers, catMgr, controlsMgr,
          histQueryService, histWizard, histBuilder,
          Category, WidgetDef, MapLayer,
          CONFIG) {
    var tag = 'stealth.histogram.geo: ';
    $log.debug(tag + 'run called');

    var dtgListener;
    var windowListener;

    var scope = $rootScope.$new();
    scope.workspaces = {};

    function updateQueryDtg (derivedLayer, startMillis, endMillis) {
        // TODO: Check against store dtgMin to make sure query startDtg is not before it.
        if (derivedLayer.query.origin === 'time-lapse') {
            derivedLayer.query.params.startDtg = moment.utc(startMillis);
            if (derivedLayer.query.params.startDtg.valueOf() < derivedLayer.query.params.minDtgMillis) {
                derivedLayer.query.params.startDtg = moment.utc(derivedLayer.query.params.minDtgMillis);
            }
            derivedLayer.query.params.endDtg = moment.utc(endMillis);
        }
    }

    scope.toggleLayer = function (gsLayer, derivedLayer) {
        if (_.isUndefined(derivedLayer.mapLayerId) || _.isNull(derivedLayer.mapLayerId)) {
            var ol3Source = new ol.source.GeoJSON({
                object: {
                    "type": "Feature",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[derivedLayer.query.params.minLon, derivedLayer.query.params.minLat],
                                         [derivedLayer.query.params.maxLon, derivedLayer.query.params.minLat],
                                         [derivedLayer.query.params.maxLon, derivedLayer.query.params.maxLat],
                                         [derivedLayer.query.params.minLon, derivedLayer.query.params.maxLat],
                                         [derivedLayer.query.params.minLon, derivedLayer.query.params.minLat]]]
                    }
                }
            });

            var ol3Layer = new ol.layer.Vector({
                source: ol3Source,
                style: new ol.style.Style({
                    stroke: new ol.style.Stroke({color: derivedLayer.viewState.fillColor}),
                    fill: new ol.style.Fill({color: [255, 255, 255, 0.35]})
                })
            });
            var wholeWorldQuery = derivedLayer.query.params.minLon === -180 &&
                                  derivedLayer.query.params.minLat === -90 &&
                                  derivedLayer.query.params.maxLon === 180 &&
                                  derivedLayer.query.params.maxLat === 90;
            if (!wholeWorldQuery) {
                ol3Layer.draggable = true;
            } else {
                ol3Layer.setVisible(false);
            }
            ol3Layer.onDragEnd = function (ol3Feature, ol3Layer) {
                var coords = ol3Feature.getGeometry().getCoordinates();
                if (coords[0][0][0] < derivedLayer.query.params.minLon ||
                    coords[0][0][0] > derivedLayer.query.params.minLon ||
                    coords[0][0][1] > derivedLayer.query.params.minLat ||
                    coords[0][0][1] > derivedLayer.query.params.minLat) {

                    derivedLayer.query.params.minLon = coords[0][0][0];
                    derivedLayer.query.params.maxLon = coords[0][1][0];
                    derivedLayer.query.params.minLat = coords[0][0][1];
                    derivedLayer.query.params.maxLat = coords[0][2][1];

                    scope.updateHistogram(ol3Layer.mapLayerId);
                }
            };
            ol3Layer.onMouseOver = function (ol3Feature, ol3Layer) {
                scope.highlightLayer(ol3Layer.mapLayerId);
                scope.highlightPopup(ol3Layer.mapLayerId);
            };
            ol3Layer.onMouseLeave = function () {
                scope.unhighlightLayer(ol3Layer.mapLayerId);
                scope.unhighlightPopup(ol3Layer.mapLayerId);
            };

            var timeMillis = derivedLayer.query.params.endDtg.valueOf();
            var windowMillis = timeMillis - derivedLayer.query.params.startDtg.valueOf();
            dtgListener = controlsMgr.registerDtgListener(function (millis) {
                timeMillis = millis;
                updateQueryDtg(derivedLayer, timeMillis - windowMillis, timeMillis);
            });

            windowListener = controlsMgr.registerWindowListener(function (millis) {
                windowMillis = millis;
                updateQueryDtg(derivedLayer, timeMillis - windowMillis, timeMillis);
            });

            var mapLayer = new MapLayer(derivedLayer.title, ol3Layer, false, 20);
            mapLayer.styleDirective = 'st-histogram-layer-style';
            mapLayer.styleDirectiveScope.styleVars.iconClass = 'fa fa-fw fa-bar-chart';
            mapLayer.styleDirectiveScope.derivedLayer = derivedLayer;
            ol3Layer.mapLayerId = mapLayer.id;
            derivedLayer.mapLayerId = mapLayer.id;
            derivedLayer.viewState.isOnMap = true;
            derivedLayer.viewState.toggledOn = ol3Layer.getVisible();
            derivedLayer.viewState.isDraggable = true;
            ol3Map.addLayer(mapLayer);

            ol3Layer.on('change:visible', function () {
                $timeout(function () {
                    derivedLayer.viewState.toggledOn = ol3Layer.getVisible();
                });
            });

            derivedLayer.viewState.isLoading = true;
            derivedLayer.histogram = {
                id: _.now(),
                viewState: {
                    toggledOn: false,
                    isLoading: false,
                    isWizardInProgress: (scope.isWizardInProgress) ? true : false
                },
                layerId: derivedLayer.mapLayerId
            };

            mapLayer.styleDirectiveScope.setFillColor = function (color) {
                var style = new ol.style.Style({
                    stroke: new ol.style.Stroke({color: color}),
                    fill: new ol.style.Fill({color: [255, 255, 255, 0.35]})
                });
                mapLayer.getOl3Layer().setStyle(style);
                derivedLayer.histogram.fillColor = color;
                if (!derivedLayer.histogram.viewState.isWizardInProgress && derivedLayer.histogram.viewState.toggledOn) {
                    derivedLayer.histogram.updateBars(derivedLayer.histogram);
                }
            };

            scope.updateHistogram(derivedLayer.mapLayerId);
        } else {
            var l = ol3Map.getLayerById(derivedLayer.mapLayerId);
            ol3Map.removeLayerById(derivedLayer.mapLayerId);
            delete derivedLayer.mapLayerId;
            derivedLayer.viewState.isOnMap = false;
            derivedLayer.viewState.toggledOn = false;
        }
    };

    scope.removeLayer = function (gsLayer, derivedLayer) {
        if (!_.isUndefined(derivedLayer.histogram)) {
            if (derivedLayer.histogram.viewState.toggledOn) {
                derivedLayer.histogram.closePopup(derivedLayer.histogram);
            }
            delete derivedLayer.histogram;
        }
        if (derivedLayer.viewState.isOnMap) {
            scope.toggleLayer(gsLayer, derivedLayer);
        }
        controlsMgr.unregisterDtgListener(dtgListener);
        controlsMgr.unregisterWindowListener(windowListener);
        _.pull(gsLayer.derivedLayers, derivedLayer);
    };

    scope.toggleVisibility = function (derivedLayer) {
        var mapLayer = ol3Map.getLayerById(derivedLayer.mapLayerId);
        var ol3Layer = mapLayer.getOl3Layer();
        ol3Layer.setVisible(!ol3Layer.getVisible());
    };

    scope.toggleDraggable = function (derivedLayer) {
        var mapLayer = ol3Map.getLayerById(derivedLayer.mapLayerId);
        var ol3Layer = mapLayer.getOl3Layer();
        derivedLayer.viewState.isDraggable = !derivedLayer.viewState.isDraggable;
        ol3Layer.draggable = !ol3Layer.draggable;
    };

    scope.updateHistogramTitle = function (derivedLayer) {
        derivedLayer.histogram.title = derivedLayer.title;
    };

    scope.showHistogram = function (histogram) {
        if (histogram.viewState.toggledOn) {
            if (histogram.viewState.isLoading) {
                var isUpdate = true;
                histBuilder.build(histogram, isUpdate);
            } else {
                var popupId = histogram.histId + '-popup';
                $rootScope.$emit('histogram:focus', popupId);
                $timeout(function () {
                    $rootScope.$emit('histogram:unhighlight', popupId);
                }, 500);
            }
        } else {
            histBuilder.build(histogram);
            histogram.viewState.toggledOn = true;
        }
    };

    function buildCQLFilter(query) {
        var cql_filter =
            'BBOX(' + query.params.geomField.name + ',' +
            query.params.minLon + ',' + query.params.minLat + ',' +
            query.params.maxLon + ',' + query.params.maxLat + ')' +
            ' AND ' + query.params.dtgField.name + ' DURING ' +
            query.params.startDtg.format('YYYY-MM-DD[T]HH:mm:ss[Z]') +
            '/' +
            query.params.endDtg.format('YYYY-MM-DD[T]HH:mm:ss[Z]');
        if (query.params.cql) {
            cql_filter += ' AND ' + query.params.cql;
        }
        return cql_filter;
    }

    scope.updateHistogram = function (id) {
        var gsLayers = _.flatten(_.map(scope.workspaces, _.identity));
        var derivedLayers = _.flatten(_.pluck(gsLayers, 'derivedLayers'));
        var derivedLayer = _.find(derivedLayers, {'mapLayerId': id});

        if (_.isUndefined(derivedLayer) || derivedLayer.histogram.viewState.isLoading) {
            return;
        }

        if (_.isUndefined(derivedLayer.histogram) && derivedLayer.histogram.viewState.isLoading) {
            return;
        }

        if (!_.isUndefined(derivedLayer.histogram.query)) {
            var cql = derivedLayer.histogram.query.params.cql;
            derivedLayer.query.params.cql = (cql === '' || _.isNull(cql)) ? null : cql;
        }

        derivedLayer.viewState.isLoading = true;
        derivedLayer.histogram.viewState.isLoading = true;
        var promise = histQueryService.doHistogramQuery({
            layer: derivedLayer.query.layerData.currentLayer.Name,
            filter: buildCQLFilter(derivedLayer.query),
            attribute: derivedLayer.query.params.attribute.name
        }).then(function (featureCollection) {
            if (_.isUndefined(derivedLayer.histogram)) {
                return;
            }

            derivedLayer.viewState.isLoading = false;
            derivedLayer.histogram.title = derivedLayer.title;
            derivedLayer.histogram.type = derivedLayer.query.params.attribute.localType;
            derivedLayer.histogram.xLabel = derivedLayer.query.params.attribute.name;
            if (_.isUndefined(derivedLayer.histogram.fillColor)){
                derivedLayer.histogram.fillColor = derivedLayer.query.params.fillColor;
            }

            derivedLayer.histogram.query = {
                params: {
                    startDtg: derivedLayer.query.params.startDtg.format('YYYY-MM-DD[T]HH:mm:ss[Z]'),
                    endDtg: derivedLayer.query.params.endDtg.format('YYYY-MM-DD[T]HH:mm:ss[Z]'),
                    minLon: derivedLayer.query.params.minLon,
                    maxLon: derivedLayer.query.params.maxLon,
                    minLat: derivedLayer.query.params.minLat,
                    maxLat: derivedLayer.query.params.maxLat,
                    cql: derivedLayer.query.params.cql
                }
            };

            derivedLayer.histogram.nBinsChoices = [];
            _.each(_.range(3, 12), function (i) {
                derivedLayer.histogram.nBinsChoices.push(Math.pow(2, i));
            });
            derivedLayer.histogram.yScaleChoices = ['linear', 'log'];

            derivedLayer.histogram.data = _.map(featureCollection.features, function (feature) {
                if (derivedLayer.histogram.type === 'date-time') {
                    feature.properties.value = moment.utc(feature.properties.value).valueOf();
                }

                if (_.isUndefined(derivedLayer.histogram.dataMin)) {
                    derivedLayer.histogram.dataMin = feature.properties.value;
                }
                if (_.isUndefined(derivedLayer.histogram.dataMax)) {
                    derivedLayer.histogram.dataMax = feature.properties.value;
                }

                if (feature.properties.value < derivedLayer.histogram.dataMin) {
                    derivedLayer.histogram.dataMin = feature.properties.value;
                }
                if (feature.properties.value > derivedLayer.histogram.dataMax) {
                    derivedLayer.histogram.dataMax = feature.properties.value;
                }

                return {
                    x: feature.properties.value,
                    y: feature.properties.count
                };
            });

            derivedLayer.histogram.data = _.sortBy(derivedLayer.histogram.data, 'x');
            var i = 1;
            derivedLayer.histogram.data = _.map(derivedLayer.histogram.data, function (datum) {
                return {
                    id: i++,
                    x: datum.x,
                    y: datum.y
                };
            });

            if (_.isUndefined(derivedLayer.histogram.dataMin)) {
                derivedLayer.histogram.dataMin = 0;
            }
            if (_.isUndefined(derivedLayer.histogram.dataMax)) {
                derivedLayer.histogram.dataMax = 1;
            }
            derivedLayer.histogram.min = derivedLayer.histogram.dataMin;
            derivedLayer.histogram.max = derivedLayer.histogram.dataMax;
            derivedLayer.histogram.updateHistogram = scope.updateHistogram;
            derivedLayer.histogram.highlightLayer = scope.highlightLayer;
            derivedLayer.histogram.unhighlightLayer = scope.unhighlightLayer;
            scope.showHistogram(derivedLayer.histogram);
        });
    };

    scope.highlightLayer = function (id) {
        var mapLayer = ol3Map.getLayerById(id);
        ol3Map.removeLayer(mapLayer);
        ol3Map.addLayer(mapLayer);

        var ol3Layer = mapLayer.getOl3Layer();
        var geoJsonSource = ol3Layer.getSource();
        var features = geoJsonSource.getFeatures();
        var geom = features[0].getGeometry();
        var coords = geom.getCoordinates();

        var hiLiteSrc = new ol.source.GeoJSON({
            object: {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": coords
                 }
            }
        });

        var hiLiteLyr = new ol.layer.Vector({
            source: hiLiteSrc,
            style: new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: [0, 199, 255, 0.35],
                    width: 7
                })
            })
        });

        if (_.isUndefined(scope.hiLiteLyr)) {
            scope.hiLiteLyr = new MapLayer('Highlight', hiLiteLyr, false, 1000);
            scope.hiLiteLyr.styleDirective = null;
            ol3Map.addLayer(scope.hiLiteLyr);
        }
    };

    scope.unhighlightLayer = function (id) {
        if (!_.isUndefined(scope.hiLiteLyr)) {
            ol3Map.removeLayer(scope.hiLiteLyr);
            delete scope.hiLiteLyr;
        }
    };

    scope.highlightPopup = function (id) {
        var gsLayers = _.reduce(scope.workspaces, function (result, workspaceLayers, key) {
            return workspaceLayers;
        }, []);

        var derivedLayers = _.reduce(gsLayers, function (result, gsLayer, key) {
            return gsLayer.derivedLayers;
        }, []);

        var derivedLayer = _.find(derivedLayers, function (lyr) {
            return lyr.mapLayerId == id;
        });

        if (!_.isUndefined(derivedLayer)) {
            var popupId = derivedLayer.histogram.histId + '-popup';
            $rootScope.$emit('histogram:focus', popupId);
        }
    };

    scope.unhighlightPopup = function (id) {
        var gsLayers = _.reduce(scope.workspaces, function (result, workspaceLayers, key) {
            return workspaceLayers;
        }, []);

        var derivedLayers = _.reduce(gsLayers, function (result, gsLayer, key) {
            return gsLayer.derivedLayers;
        }, []);

        var derivedLayer = _.find(derivedLayers, function (lyr) {
            return lyr.mapLayerId == id;
        });

        if (!_.isUndefined(derivedLayer)) {
            var popupId = derivedLayer.histogram.histId + '-popup';
            $rootScope.$emit('histogram:unhighlight', popupId);
        }
    };

    scope.launchHistogramWizard = function (gsLayer) {
        var now = moment().utc();
        var oneWeekAgo = now.clone().subtract(7, 'days');

        var dtgF = _.find(gsLayer.featureTypeDescription.featureTypes[0].properties,
            {'name': _.deepGet(gsLayer.KeywordConfig, 'capability.histogram.field.dtg') || 'dtg'});
        var geomF = _.find(gsLayer.featureTypeDescription.featureTypes[0].properties,
            {'name': _.deepGet(gsLayer.KeywordConfig, 'capability.histogram.field.geom') || 'geom'});

        var query = {
            featureTypeData: gsLayer.featureTypeDescription,
            layerData: {
                currentLayer: {
                    Name: gsLayer.Name,
                    Title: gsLayer.Title
                }
            },
            params: {
                dtgField: dtgF,
                geomField: geomF,
                minLon: -180,
                minLat: -90,
                maxLon: 180,
                maxLat: 90,
                startDtg: oneWeekAgo,
                endDtg: now,
                cql: null
            }
        };

        scope.isWizardInProgress = true;
        histWizard.launch(gsLayer.Name, query);
    };

    var draggableIds = [];

    scope.deregLaunchWizardListener = $rootScope.$on('wizard:launchWizard', function () {
        _.each(scope.workspaces, function (gsLayers) {
            _.each(gsLayers, function (gsLayer) {
                _.each(gsLayer.derivedLayers, function (derivedLayer) {
                    scope.isWizardInProgress = true;
                    derivedLayer.histogram.viewState.isWizardInProgress = true;
                    var ol3Layer = ol3Map.getLayerById(derivedLayer.mapLayerId).getOl3Layer();
                    if (ol3Layer.draggable) {
                        draggableIds.push(derivedLayer.mapLayerId);
                    }
                    ol3Layer.draggable = false;
                });
            });
        });
    });

    scope.deregCloseWizardListener = $rootScope.$on('wizard:closeWizard', function () {
        _.each(scope.workspaces, function (gsLayers) {
            _.each(gsLayers, function (gsLayer) {
                _.each(gsLayer.derivedLayers, function (derivedLayer) {
                    scope.isWizardInProgress = false;
                    derivedLayer.histogram.viewState.isWizardInProgress = false;
                    var wasDraggable = _.find(draggableIds, function (id) {
                        return id == derivedLayer.mapLayerId;
                    });
                    if (wasDraggable) {
                        var ol3Layer = ol3Map.getLayerById(derivedLayer.mapLayerId).getOl3Layer();
                        ol3Layer.draggable = true;
                    }
                    draggableIds = [];
                });
            });
        });
    });

    var getFeatureTypeDescription = function (gsLayer) {
        wfs.getFeatureTypeDescription(CONFIG.geoserver.defaultUrl,
                                      gsLayer.Name,
                                      CONFIG.geoserver.omitProxy)
        .then(
            function (description) {
                gsLayer.featureTypeDescription = description;
            }
        );
    };

    var keywordPrefix = 'histogram';
    owsLayers.getLayers(keywordPrefix)
        .then(function (layers) {
            $log.debug('owsLayers.getLayers()');
            _.each(layers, function (l) {
                var gsLayer = _.cloneDeep(l);
                gsLayer.derivedLayers = [];
                getFeatureTypeDescription(gsLayer);

                _.each(_.deepGet(gsLayer.KeywordConfig, keywordPrefix), function (conf, role, keywordObj) {
                    var workspaceObj = keywordObj[role];
                    _.forOwn(workspaceObj, function (value, workspace) {
                        if (_.isArray(scope.workspaces[workspace])) {
                            scope.workspaces[workspace].push(gsLayer);
                        } else {
                            scope.workspaces[workspace] = [gsLayer];
                        }
                    });
                });
            });
        });

    histWizard.setCategoryScope(scope);

    var widgetDef = new WidgetDef('st-histogram-geo-category', scope);
    var category = new Category(1, 'Histograms', 'fa-bar-chart', widgetDef, null, true);
    catMgr.addCategory(1, category);
}])

.directive('stHistogramGeoCategory', [
'$log',
function ($log) {
    var tag = 'stealth.histogram.geo.stHistogramGeoCategory: ';
    $log.debug(tag + 'directive defined');
    return {
        templateUrl: 'histogram/geo/category.tpl.html'
    };
}])

;