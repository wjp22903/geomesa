angular.module('stealth.common.map.ol.draw.route', [
    'stealth.common.control.openLayersModifyTrack',
    'stealth.common.map.geoFormat',
    'stealth.common.map.ol.draw.trackEdit'
])

    /**
     * Drawn routes/tracks are maintained as LineStrings. However, we must
     * record non-geo data for each vertex.  For example, a track must have
     * DTG for each vertex. We store this in a "pointData" property of the
     * LineString. The pointData value is itself a GeoJSON FeatureCollection
     * of the vertices, in the order they appear in the parent LineString.
     * The pointData points are given the ID of the OpenLayers Geometry that
     * they match to in the OpenLayers.Feature.Vector representation of the
     * LineString.
     *
     * Example GeoJSON for a track:
     * {
     *     "type": "Feature",
     *     "properties": {
     *         "pointData": {
     *             "type": "FeatureCollection",
     *             "features": [
     *                 {
     *                     "id": "OpenLayers_Geometry_Point_17444",
     *                     "type": "Feature",
     *                     "properties": {
     *                         "dtg": "2014-09-01T00:00:00.000Z"
     *                     },
     *                     "geometry": {
     *                         "type": "Point",
     *                         "coordinates": [
     *                             -78.451385498047,
     *                             38.023071289063
     *                         ]
     *                     }
     *                 },
     *                 {
     *                     "id": "OpenLayers_Geometry_Point_17445",
     *                     "type": "Feature",
     *                     "properties": {
     *                         "dtg": "2014-09-01T00:52:07.068Z"
     *                     },
     *                     "geometry": {
     *                         "type": "Point",
     *                         "coordinates": [
     *                             -78.071594238281,
     *                             37.927398681641
     *                         ]
     *                     }
     *                 }
     *             ]
     *         }
     *     },
     *     "geometry": {
     *         "type": "LineString",
     *         "coordinates": [
     *             [
     *                 -78.451385498047,
     *                 38.023071289063
     *             ],
     *             [
     *                 -78.071594238281,
     *                 37.927398681641
     *             ]
     *         ]
     *     }
     * }
     */
    .directive('openlayersDrawRoute', [
        '$rootScope', '$modal', 'OpenLayersModifyTrack', 'GeoFormat',
        function ($rootScope, $modal, OpenLayersModifyTrack, GeoFormat) {
            return {
                require: '^openlayersMap',
                restrict: 'E',
                link: function (scope, element, attrs, mapCtrl) {
                    var map = mapCtrl.getMap(),
                        layer = mapCtrl.addLayer(new OpenLayers.Layer.Vector('Drawings', {
                            displayInLayerSwitcher: false,
                            styleMap: new OpenLayers.StyleMap(_.merge(_.cloneDeep(OpenLayers.Feature.Vector.style), {
                                default: {
                                    strokeWidth: 5
                                },
                                select: {
                                    strokeWidth: 5
                                },
                                temporary: {
                                    strokeWidth: 5
                                }
                            }))
                        })),
                        selectFeatureControl = new OpenLayers.Control.SelectFeature(layer, {
                            displayClass: 'openlayersSelectRoute',
                            title: 'Select Route',
                            geometryTypes: ['OpenLayers.Geometry.LineString'],
                            onSelect: function (feature) {
                                scope.$apply(function () {
                                    var geoJson = parser.write(feature),
                                        route = JSON.parse(geoJson);
                                    delete route.crs;

                                    $modal.open({
                                        scope: scope,
                                        templateUrl: 'common/map/ol/draw/routeSelect.tpl.html',
                                        controller: function ($scope, $modalInstance) {
                                            $scope.modal = {
                                                cancel: function () {
                                                    $modalInstance.dismiss('cancel');
                                                },
                                                //A route can only be used as a track if every point has a valid dtg.
                                                isValidTrack: function () {
                                                    var previous = moment('1900'); //assume everything will be after the year 1900
                                                    return _.all(route.properties.pointData.features, function (point) {
                                                        var pointDate = moment(point.properties.dtg, 'YYYY-MM-DDTHH:mm:ss.sssZ', true);
                                                            valid = !previous.isAfter(pointDate) && pointDate.isValid();
                                                        previous = pointDate;
                                                        return valid;
                                                    });
                                                },
                                                setInputRoute: function () {
                                                    if (!route.id) {
                                                        route.id = 'Drawing' + feature.id.substring(feature.id.lastIndexOf('_'));
                                                    }
                                                    $rootScope.$emit('SetInputRoute', route);
                                                    $modalInstance.dismiss('setInputRoute');
                                                },
                                                setInputTrack: function () {
                                                    if ($scope.modal.isValidTrack()) {
                                                        $rootScope.$emit('SetInputTrack', route.properties.pointData.features);
                                                        $modalInstance.dismiss('setInputTrack');
                                                    }
                                                },
                                                exportFormat: 'csv',
                                                export: function (format) {
                                                    var output = null;
                                                    switch (format) {
                                                        case 'json':
                                                            output = JSON.stringify(route, null, 4);
                                                            break;
                                                        case 'csv':
                                                            output = GeoFormat.geoJsonToCsv(route, GeoFormat.coordFormat.dmshCombined, ['DMS']);
                                                            break;
                                                    }
                                                    var blob = new Blob([output], {type: "text/plain;charset=utf-8"});
                                                    saveAs(blob, 'route.' + format);
                                                    $modalInstance.dismiss('export');
                                                }
                                            };
                                        },
                                        backdrop: true
                                    }).result.finally(function () {
                                        selectFeatureControl.unselectAll();
                                    });
                                });
                            }
                        }),
                        parser = new OpenLayers.Format.GeoJSON(),
                        fileInput = element.append('<input type="file" style="visibility:hidden;height:0px;">');

                    //Couple FileReader to the hidden file input created above.
                    FileReaderJS.setupInput(fileInput[0].firstChild, {
                        readAsDefault: 'Text',
                        on: {
                            load: function (e, file) {
                                var feature = null;
                                switch (file.extra.extension.toLowerCase()) {
                                    case 'json':
                                        feature = parser.read(e.target.result);
                                        break;
                                    case 'csv':
                                        feature = GeoFormat.csvToFeatures(e.target.result, 'LineString', GeoFormat.coordFormat.dmshCombined, ['DMS']);
                                        break;
                                }
                                layer.addFeatures(_.isArray(feature) ? feature : [feature]);
                                map.zoomToExtent(layer.getDataExtent());

                                //Wrap input in form, reset form, and then unwrap.
                                fileInput.wrap('<form>').closest('form').get(0).reset();
                                fileInput.unwrap();
                            }
                        }
                    });

                    _.each(map.getControlsBy('designation', 'toolbar'), function (toolbar) {
                        toolbar.addControls([
                            //For drawing new routes
                            new (OpenLayers.Class(OpenLayers.Control.DrawFeature, {
                                initialize: function (layer, handler, options) {
                                    OpenLayers.Control.DrawFeature.prototype.initialize.apply(this, [layer, handler, options]);
                                    this.keyboardCallbacks = {
                                        keydown: this.handleKeyDown
                                    };
                                    this.keyboardHandler = new OpenLayers.Handler.Keyboard(this, this.keyboardCallbacks, {});
                                },
                                handleKeyDown: function (evt) {
                                    var handled = false;
                                    switch (evt.keyCode) {
                                        case 37: //left-arrow
                                        case 38: //up-arrow
                                        case 46: //delete
                                        case 8:  //backspace
                                            this.undo();
                                            handled = true;
                                            break;
                                        case 39: //right-arrow
                                        case 40: //down-arrow
                                            this.redo();
                                            handled = true;
                                            break;
                                        case 27: // esc
                                            this.cancel();
                                            handled = true;
                                            break;
                                        case 13: //enter
                                            this.finishSketch();
                                            handled = true;
                                            break;
                                    }
                                    if (handled) {
                                        OpenLayers.Event.stop(evt);
                                    }
                                },
                                activate: function () {
                                    OpenLayers.Control.DrawFeature.prototype.activate.apply(this, arguments);
                                    this.keyboardHandler.activate();
                                },
                                deactivate: function () {
                                    OpenLayers.Control.DrawFeature.prototype.deactivate.apply(this, arguments);
                                    this.keyboardHandler.deactivate();
                                }
                            }))(layer, OpenLayers.Handler.Path, {
                                displayClass: 'openlayersDrawRoute',
                                title: 'Draw Route',
                                //Populate pointData with vertex info
                                featureAdded: function (feature) {
                                    feature.attributes = {
                                        pointData: { //holds data for each point in the line
                                            type: 'FeatureCollection',
                                            features: []
                                        }
                                    };
                                    _.each(feature.geometry.getVertices(), function (vertex) {
                                        feature.attributes.pointData.features.push({
                                            id: vertex.id, //ID of OpenLayers.Geometry.Point in Feature
                                            type: 'Feature',
                                            properties: {},
                                            geometry: {
                                                type: 'Point',
                                                coordinates: [vertex.x, vertex.y]
                                            }
                                        });
                                    });
                                },
                                eventListeners: {
                                    activate: function () {
                                        scope.$apply(function () {
                                            map.setLayerIndex(layer, map.getNumLayers() - 2);
                                        });
                                    }
                                }
                            }),

                            //For moving and adding vertices to route
                            new OpenLayers.Control.ModifyFeature(layer, {
                                displayClass: 'openlayersModifyRoute',
                                title: 'Modify Route',
                                geometryTypes: ['OpenLayers.Geometry.LineString'],
                                vertexRenderIntent: 'temporary',
                                //Update pointData. New points might've been added and existing points might've moved.
                                onModification: function (feature) {
                                    var newPointData = {
                                        type: 'FeatureCollection',
                                        features: []
                                    };
                                    _.each(feature.geometry.getVertices(), function (vertex) {
                                        var newPoint = {
                                                id: vertex.id, //ID of OpenLayers.Geometry.Point in Feature
                                                type: 'Feature',
                                                properties: {},
                                                geometry: {
                                                    type: 'Point',
                                                    coordinates: [vertex.x, vertex.y]
                                                }
                                            },
                                            oldPoint = _.find(feature.attributes.pointData.features, {id: vertex.id});
                                        if (oldPoint) {
                                            newPoint.properties = oldPoint.properties;
                                        }
                                        newPointData.features.push(newPoint);
                                    });
                                    feature.attributes.pointData = newPointData;
                                }
                            }),

                            //For changing dtg of track points
                            OpenLayersModifyTrack.createControl(layer, {
                                displayClass: 'openlayersModifyTrack',
                                title: 'Modify Track Times',
                                vertexRenderIntent: 'temporary',
                                eventListeners: {
                                    featureselected: function (e) {
                                        scope.$apply(function () {
                                            $rootScope.$emit('BeginTrackEdit', e.feature);
                                        });
                                    },
                                    featureunselected: function (e) {
                                        scope.$apply(function () {
                                            $rootScope.$emit('EndTrackEdit');
                                        });
                                    }
                                }
                            }),

                            //For selecting a drawn or imported route/track
                            selectFeatureControl,

                            //For importing a route from file
                            new OpenLayers.Control.Button({
                                displayClass: 'openlayersImportRoute',
                                title: 'Import Route',
                                trigger: function () {
                                    fileInput[0].firstChild.click();
                                }
                            })
                        ]);
                    });
                }
            };
        }
    ])
;
