angular.module('stealth.common.imagery.imageryManager', [
    'stealth.common.utils',
    'stealth.ows.ows',
    'ui.layout'
])

    .controller('ImageryManagerController', ['$scope', '$rootScope', '$http', '$filter', 'WFS', 'CONFIG', function ($scope, $rootScope, $http, $filter, WFS, CONFIG) {
        var now = new Date(),
            aWeekAgo = new Date(),
            noTime = new Date(),
            offset = moment().zone();
        now.setMinutes(now.getMinutes() + offset);
        aWeekAgo.setDate(now.getDate() - 7);
        aWeekAgo.setMinutes(aWeekAgo.getMinutes() + offset);
        noTime.setHours(0);
        noTime.setMinutes(0);
        $scope.step = 1;
        $scope.search = {
            form: {
                startDateOpen: false,
                endDateOpen: false,
                toggleDateOpen: function ($event, open) {
                    $event.preventDefault();
                    $event.stopPropagation();
                    return !open;
                },
                clearStartDatetime: function () {
                    $scope.search.criteria.startDate = null;
                    $scope.search.criteria.startTime = _.cloneDeep(noTime);
                },
                clearEndDatetime: function () {
                    $scope.search.criteria.endDate = null;
                    $scope.search.criteria.endTime = _.cloneDeep(noTime);
                },
                useMapExtent: function () {
                    $rootScope.$emit('MapExtentCallback', function (extent) {
                        var arr = extent.toArray();
                        $scope.search.criteria.minLat = arr[1];
                        $scope.search.criteria.maxLat = arr[3];
                        $scope.search.criteria.minLon = arr[0];
                        $scope.search.criteria.maxLon = arr[2];
                    });
                },
                clearBoundingBox: function () {
                    $scope.search.criteria.minLat = null;
                    $scope.search.criteria.maxLat = null;
                    $scope.search.criteria.minLon = null;
                    $scope.search.criteria.maxLon = null;
                }
            },
            criteria: {
                server: _.isEmpty(CONFIG.imagery.servers) ? null : CONFIG.imagery.servers[0],
                startDate: aWeekAgo,
                startTime: _.cloneDeep(aWeekAgo),
                endDate: now,
                endTime: _.cloneDeep(now),
                a: '',
                b: '',
                c: '',
                d: '',
                f: '',
                filename: '',
                cqlFilter: '',
                sortField: '',
                sortOrder: 'D'
            },
            results: [],
            running: false,
            buildCql: function (criteriaObj) {
                var arr = [];

                if (_.isFinite(criteriaObj.minLat) && _.isFinite(criteriaObj.maxLat) &&
                    _.isFinite(criteriaObj.minLon) && _.isFinite(criteriaObj.maxLon)) {
                    arr.push('INTERSECTS(ground_geom,POLYGON((' +
                        criteriaObj.minLon + ' ' + criteriaObj.minLat + ',' +
                        criteriaObj.minLon + ' ' + criteriaObj.maxLat + ',' +
                        criteriaObj.maxLon + ' ' + criteriaObj.maxLat + ',' +
                        criteriaObj.maxLon + ' ' + criteriaObj.minLat + ',' +
                        criteriaObj.minLon + ' ' + criteriaObj.minLat + ')))'
                    );
                }
                if (_.isDate(criteriaObj.startDate)) {
                    arr.push("acquisition_date > '" +
                        moment(criteriaObj.startDate).format('YYYY-MM-DD') + 'T' +
                        moment(criteriaObj.startTime).format('HH:mm:ss.SSS') + "Z'"
                    );
                }
                if (_.isDate(criteriaObj.endDate)) {
                    arr.push("acquisition_date < '" +
                        moment(criteriaObj.endDate).format('YYYY-MM-DD') + 'T' +
                        moment(criteriaObj.endTime).format('HH:mm:ss.SSS') + "Z'"
                    );
                }
                if (!_.isEmpty(criteriaObj.a.trim())) {
                    arr.push(CONFIG.imagery.metadata.fields.a.name + " = '" + criteriaObj.a + "'");
                }
                if (!_.isEmpty(criteriaObj.b.trim())) {
                    arr.push(CONFIG.imagery.metadata.fields.b.name + " = '" + criteriaObj.b + "'");
                }
                if (!_.isEmpty(criteriaObj.c.trim())) {
                    arr.push(CONFIG.imagery.metadata.fields.c.name + " = '" + criteriaObj.c + "'");
                }
                if (!_.isEmpty(criteriaObj.d.trim())) {
                    arr.push(CONFIG.imagery.metadata.fields.d.name + " = '" + criteriaObj.d + "'");
                }
                if (_.isFinite(criteriaObj.e)) {
                    arr.push(CONFIG.imagery.metadata.fields.e.name + " >= " + criteriaObj.e);
                }
                if (!_.isEmpty(criteriaObj.f.trim())) {
                    arr.push(CONFIG.imagery.metadata.fields.f.name + " = '" + criteriaObj.f + "'");
                }
                if (!_.isEmpty(criteriaObj.filename.trim())) {
                    arr.push("filename = '" + criteriaObj.filename + "'");
                }
                if (!_.isEmpty(criteriaObj.cqlFilter.trim())) {
                    arr.push(criteriaObj.cqlFilter);
                }

                return arr.length > 0 ? arr.join(' AND ') : null;
            },
            findImagery: function () {
                $scope.step = 2;
                $scope.search.running = true;
                $scope.search.results = [];
                if ($scope.select.coverageLayer) {
                    $scope.select.coverageLayer.removeAllFeatures();
                }
                WFS.getFeature($scope.search.criteria.server.url, 'raster_entry', {
                    outputFormat: null,  //server decides
                    //maxFeatures: 100,  //remove limit, if we add paging or infinite scroll
                    //sortBy: _.isEmpty($scope.search.criteria.sortField.trim()) ? null : ($scope.search.criteria.sortField + ':' + $scope.search.criteria.sortOrder),
                    filter: $scope.search.buildCql($scope.search.criteria),
                    version: null
                }, true).then(function (response) {
                    var parser = new OpenLayers.Format.GML(),
                        results = parser.read(response.data);
                    if (_.isEmpty($scope.search.criteria.sortField.trim())) {
                        $scope.search.results = results;
                    } else {
                        if ($scope.search.criteria.sortOrder === 'A') {
                            $scope.search.results = _.sortBy(results, function (image) {
                                return image.attributes[$scope.search.criteria.sortField];
                            });
                        } else {
                            $scope.search.results = _.sortBy(results, function (image) {
                                return image.attributes[$scope.search.criteria.sortField];
                            }).reverse();
                        }
                    }

                    if ($scope.select.coverageLayer) {
                        $scope.select.coverageLayer.addFeatures($scope.search.results);
                    }
                    $scope.select.coverageLayerVisible = true;
                }, function () {
                    alert('WFS failed');
                }).finally(function () {
                    $scope.search.running = false;
                });
            }
        };
        $scope.select = {
            currentPage: 1,
            pageSize: 10,
            numberOfPages: function () {
                return Math.ceil($scope.search.results.length/$scope.select.pageSize);
            },
            coverageLayerVisible: true,
            filterImageAttributes: function (attributes) {
                return _.omit(attributes, [
                    'class_name',
                    'data_type',
                    'entry_id',
                    'file_type',
                    'filename',
                    'height',
                    'id',
                    'image_id',
                    'index_id',
                    'keep_forever',
                    'security_code',
                    'tie_point_set',
                    'title',
                    'width'
                ]);
            },
            toggleImage: function (image) {
                if (image.isSelected) {
                    $rootScope.$emit("ReplaceWmsMapLayers", [image.attributes.image_id], {
                        name: image.attributes.image_id,
                        url: $filter('endpoint')($scope.search.criteria.server.url, 'ogc/wms', true),
                        layers: [image.attributes.image_id],
                        layerAddedCallback: function (map, layer) {
                            map.setLayerIndex(layer, 0); //push imagery to bottom, below coverage layer
                        }
                    });
                    image.isVisible = true;
                } else {
                    $rootScope.$emit("RemoveMapLayers", image.attributes.image_id);
                }
            },
            updateImageVis: function (image) {
                $rootScope.$emit('SetLayerVisibility', image.attributes.image_id, image.isVisible);
            },
            imageMouseenter: function (image) {
                $scope.select.coverageLayer.drawFeature(image, 'select');
            },
            imageMouseleave: function (image) {
                if ($scope.select.coverageLayerVisible) {
                    $scope.select.coverageLayer.drawFeature(image, 'default');
                } else {
                    $scope.select.coverageLayer.drawFeature(image, 'hidden');
                }
            },
            zoomToCoverage: function () {
                $scope.select.coverageLayer.map.zoomToExtent($scope.select.coverageLayer.getDataExtent());
            },
            zoomToImage: function (image) {
                $scope.select.coverageLayer.map.zoomToExtent(image.geometry.getBounds());
            },
            toggleCoverage: function () {
                $scope.select.coverageLayerVisible = !$scope.select.coverageLayerVisible;
                _.each($scope.search.results, function (image) {
                    $scope.select.imageMouseleave(image);
                });
            }
        };

        $rootScope.$emit("ReplaceVectorMapLayers", ['Imagery Coverage'], {
            name: 'Imagery Coverage',
            styleMap: new OpenLayers.StyleMap({
                default: new OpenLayers.Style({
                    fillOpacity: 0,
                    strokeColor: '#FFCC00',
                    graphicZIndex: 1
                }),
                select: new OpenLayers.Style({
                    fillOpacity: 0,
                    strokeColor: '#00E600',
                    graphicZIndex: 2
                }),
                hidden: new OpenLayers.Style({
                    display: 'none'
                })
            }),
            rendererOptions: {zIndexing: true},
            displayInLayerSwitcher: false,
            layerAddedCallback: function (map, layer) {
                $scope.select.coverageLayer = layer;
                var numBaseLayers = _.reduce(map.layers, function (count, l) {
                    if (l.isBaseLayer) {
                        count++;
                    }
                    return count;
                }, 0);
                map.setLayerIndex(layer, numBaseLayers); //push coverage layer to bottom
            }
        });
    }])

    .directive('imageryForm', [function () {
        return {
            restrict: 'AE',
            replace: true,
            templateUrl: 'common/imagery/imageryForm.tpl.html'
        };
    }])
;
