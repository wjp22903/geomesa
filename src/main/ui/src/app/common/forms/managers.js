angular.module('stealth.common.forms.managers', [
    'stealth.ows.ows'
])

.service('QueryFormManager', [
    'CONFIG', 'WFS',
    function (CONFIG, WFS) {

        // Private Members
        var queries = {},
            copies = {};

        // Private Methods
        function Query () {
            var now = new Date(),
                aWeekAgo = new Date(),
                noTime = new Date();
            aWeekAgo.setDate(now.getDate() - 7);
            noTime.setHours(0);
            noTime.setMinutes(0);

            var startDate = aWeekAgo;
            var endDate = now;

            var startTime = _.cloneDeep(startDate);
            var endTime = _.cloneDeep(endDate);

            var query = {
                serverData: {
                    // The value the user enters into the form.
                    proposedGeoserverUrl: CONFIG.geoserver.defaultUrl,
                    // The value after the users clicks 'Choose'.
                    currentGeoserverUrl: null
                },
                params: {
                    idField: null,
                    maxLat: null,
                    minLat: null,
                    maxLon: null,
                    minLon: null,
                    isStartCalOpen: false,
                    startDate: startDate,
                    isEndCalOpen: false,
                    endDate: endDate,
                    startTime: startTime,
                    endTime: endTime,
                    cql: null
                },
                toggleCalendar: function ($event, isOpen) {
                    $event.preventDefault();
                    $event.stopPropagation();
                    return !isOpen;
                },
                clearStartDatetime: function () {
                    query.params.startDate = null;
                    query.params.startTime = _.cloneDeep(noTime);
                },
                clearEndDatetime: function () {
                    query.params.endDate = null;
                    query.params.endTime = _.cloneDeep(noTime);
                }
            };

            // Get capabilities.
            query.updateServer = function () {
                query.serverData.error = null;
                query.serverData.currentGeoserverUrl =
                    query.serverData.proposedGeoserverUrl;
                query.layerData = {};
                query.filterData = {};
                query.style = {
                    name: '',
                    'background-color': '#0099CC'
                };

                WFS.getCapabilities(query.serverData.currentGeoserverUrl,
                                    CONFIG.geoserver.omitProxy || false)
                    .then(
                        function (data) {
                            query.getCapabilitiesError = null;
                            query.layerData.layers =
                                _.flatten(_.pluck(_.pluck(data, 'featureTypeList'), 'featureTypes'), true);
                            query.layerData.currentLayerFriendlyName = null;
                        },
                        function (error) {
                            // The GetCapabilites request failed.
                            query.getCapabilitiesError =
                                'GetCapabilities request failed. Error: ' +
                                error.status + ' ' + error.statusText;
                        }
                    );
            };

            // Invoked when the current selected layer changes on query form.
            query.getFeatureTypeDescription = function () {
                query.layerData.error = null;
                query.filterData = {};
                query.featureTypeData = null;

                WFS.getFeatureTypeDescription(query.serverData.currentGeoserverUrl,
                                              query.layerData.currentLayer.name,
                                              CONFIG.geoserver.omitProxy || false)

                    .then(
                        function (data) {
                            query.featureTypeData = data;
                            if (data.error) { // Response is successful,
                                              // but no description is
                                              // found for the type.
                                query.featureTypeData = 'unavailable';
                            }
                        },
                        function (error) {
                            query.serverData.error =
                                'GetFeatureTypeDescription request failed. Error: ' +
                                error.status + ' ' + error.statusText;
                        }
                    )
                ;
            };

            return query;
        }

        // Public Mehods
        this.getQueryData = function (id) {
            if (!queries[id]) {
                queries[id] = new Query();
            }
            return queries[id];
        };

        this.copyQueryData = function (id) {
            if (queries[id]) {
                copies[id] = angular.copy(queries[id]);
            }
            return copies[id];
        };

        this.getQueryDataCopy = function (id) {
            return copies[id];
        };
    }
]);
