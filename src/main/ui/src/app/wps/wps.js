angular.module('stealth.wps.wps', [
    'stealth.wps.wpsProcess'
])

    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/wps', {
            templateUrl: 'wps/wps.tpl.html'
        });
    }])

    .controller('WpsController', ['$scope', function($scope) {
        $scope.isLeftPaneVisible = true;
        $scope.wpsUrl = 'http://localhost:8081/geoserver/wps';
        $scope.process = 'none';

        $scope.processOneUp = 1;
        $scope.processes = {};
        $scope.addProcess = function (name) {
            if (process) {
                var key = $scope.processOneUp++,
                    keyStr = key.toString(),
                    pad = "0000",
                    paddedKey = pad.substring(0, pad.length - keyStr.length) + keyStr;
                if (!name) {
                    name = "proc_" + key;
                }
                $scope.processes[paddedKey] = {
                    name: name,
                    execute: true,
                    description: process,
                    selectedFormat: {},
                    process: $scope.wpsClient.getProcess('server', process.identifier)
                };
            }
        };
        $scope.removeProcess = function (key) {
            delete $scope.processes[key];
        };

        $scope.setWpsServer = function () {
            $scope.wpsClient = new OpenLayers.CcriWPSClient({
                servers: {
                    server: $scope.wpsUrl
                }
            });
            OpenLayers.Request.GET({
                url: $scope.wpsUrl,
                params: {
                    "SERVICE": "WPS",
                    "REQUEST": "GetCapabilities"
                },
                success: function(response){
                    capabilities = new OpenLayers.Format.WPSCapabilities().read(
                        response.responseText
                    );
                    var dropdown = document.getElementById("processes");
                    var offerings = capabilities.processOfferings, option;
                    // clear dropdown
                    while (dropdown.lastChild) {
                        dropdown.removeChild(dropdown.lastChild);
                    }
                    option = document.createElement('option');
                    option.innerHTML = 'Select a process';
                    option.value = 'none';
                    dropdown.appendChild(option);
                    // populate the dropdown
                    for (var p in offerings) {
                        option = document.createElement("option");
                        option.innerHTML = offerings[p].identifier;
                        option.value = p;
                        dropdown.appendChild(option);
                    }
                }
            });
        };
        $scope.setWpsServer();

        $scope.$watch('process', function (newValue, oldValue) {
            process = null;
            if (newValue !== 'none' && capabilities) {
                OpenLayers.Request.GET({
                    url: $scope.wpsUrl,
                    params: {
                        "SERVICE": "WPS",
                        "REQUEST": "DescribeProcess",
                        "VERSION": capabilities.version,
                        "IDENTIFIER": newValue
                    },
                    success: function(response) {
                        process = new OpenLayers.Format.WPSDescribeProcess().read(
                            response.responseText
                        ).processDescriptions[newValue];
                        document.getElementById("abstract").innerHTML = process["abstract"];
                    }
                });
            }
        });

        $scope.execute = function () {
            _.forEach($scope.processes, function (value, key) {
                var configInputs = {};
                //Remove occurrences that the user has not filled out
                for (var i=value.description.dataInputs.length-1; i>=0; --i) {
                    input = value.description.dataInputs[i];
                    if ((input.minOccurs === 0 || input.occurrence) && !input.data && !input.reference) {
                        //OpenLayers.Util.removeItem(value.description.dataInputs, input);
                    } else {
                        configInputs[input.identifier] = input.data;
                    }
                }
                value.process.configure({
                    inputs: configInputs,
                    callback: function () {
                        if (value.execute) {
                            value.process.executeOnly({
                                success: function (outputs) {
                                    var outputEl = document.getElementById('wpsOutput' + key);
                                        textarea = document.createElement('textarea');
                                    while (outputEl.lastChild) {
                                        outputEl.removeChild(outputEl.lastChild);
                                    }
                                    outputEl.innerHTML = '<h4>Output:</h4>';
                                    textarea.setAttribute('readonly', 'true');
                                    textarea.innerHTML = outputs.result;
                                    outputEl.appendChild(textarea);
                                    if (outputs.features) {
                                        $scope.layer.addFeatures(outputs.features);
                                    }
                                }
                            });
                        }
                    }
                });
            });
        };
        angular.element(document).ready(function () {
            var capabilities, // the capabilities, read by Format.WPSCapabilities::read
                process; // the process description from Format.WPSDescribeProcess::read

            // create the UI
            $scope.layer = new OpenLayers.Layer.Vector("Scratchpad");
            var toolbar = new OpenLayers.Control.EditingToolbar($scope.layer);
            toolbar.addControls([new OpenLayers.Control.ModifyFeature($scope.layer, {
                title: "Select feature"
            })]);
            $scope.map = new OpenLayers.Map('wpsMap', {
                controls: [
                    toolbar,
                    new OpenLayers.Control.ZoomPanel(),
                    new OpenLayers.Control.PanPanel()
                ],
                layers: [
                    new OpenLayers.Layer.WMS(
                        "OSM", "http://maps.opengeo.org/geowebcache/service/wms",
                        {layers: "openstreetmap", format: "image/png"},
                        {wrapDateLine: true}
                    ), $scope.layer
                ]
            });
            $scope.map.zoomTo(1);
        });
        $scope.$on("CenterPaneFullWidthChange", function (event, fullWidth) {
            $scope.map.updateSize();
        });
    }]);
