angular.module('stealth.wps.wps', [
    'stealth.wps.wpsProcess'
])

    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/wps', {
            templateUrl: 'wps/wps.tpl.html',
            controller: 'WpsController'
        });
    }])

    .controller('WpsController', ['$scope', function($scope) {
        $scope.isLeftPaneVisible = true;
        $scope.wpsUrl = 'http://localhost:8081/geoserver/wps';
        $scope.process = 'Select a process';

        $scope.processOneUp = 1;
        $scope.processes = {};
        $scope.addProcess = function (name) {
            var key = $scope.processOneUp++,
                keyStr = key.toString(),
                pad = "0000",
                paddedKey = pad.substring(0, pad.length - keyStr.length) + keyStr;
            if (!name) {
                name = "proc_" + key;
            }
            $scope.processes[paddedKey] = {
                name: name,
                execute: false,
                description: process,
                selectedFormat: {},
                process: $scope.wpsClient.getProcess('server', process.identifier)
            };
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
            if (capabilities) {
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
            /*var area = $scope.wpsClient.getProcess('server', 'JTS:area');
            area.execute({
                inputs: {
                    geom: OpenLayers.Geometry.fromWKT(
                        'POLYGON((110 20,120 20,120 10,110 10,110 20),(112 17,118 18,118 16,112 15,112 17))'
                    )
                },
                success: function(outputs) {
                    alert('success');
                }
            });*/
            /*var features = [new OpenLayers.Feature.Vector(OpenLayers.Geometry.fromWKT(
                'LINESTRING(117 22,112 18,118 13, 115 8)'
            ))];
            var geometry = OpenLayers.Geometry.fromWKT(
                'POLYGON((110 20,120 20,120 10,110 10,110 20),(112 17,118 18,118 16,112 15,112 17))'
            );

            // Create a process and configure it
            intersect = $scope.wpsClient.getProcess('server', 'JTS:intersection');
            intersect.configure({
                // spatial input can be a feature or a geometry or an array of
                // features or geometries
                inputs: {
                    a: features,
                    b: geometry
                }
            });
            var buffer = $scope.wpsClient.getProcess('server', 'JTS:buffer');
            buffer.execute({
                        inputs: {
                            geom: intersect.output(),
                                      distance: 1
                        },
                        success: function (outputs) {
                            alert(outputs);
                        }
            });*/
            /*var query = $scope.wpsClient.getProcess('server', 'vec:Query');
            query.execute({
                inputs: {
                    features: OpenLayers.Geometry.fromWKT(
                                                                                                              'POLYGON((110 20,120 20,120 10,110 10,110 20),(112 17,118 18,118 16,112 15,112 17))'
                                                                                                          ),
                    filter: "(BBOX(geomesa_index_geometry, 44.9,44.9,45.1,45.1) OR BBOX(geomesa_index_geometry, 45.9, 45.9, 46.1, 46.1) OR BBOX(geomesa_index_geometry, 46.9, 46.9, 47.1, 47.1) OR BBOX(geomesa_index_geometry, 47.9, 47.9, 48.1, 48.1)) AND type='a'"
                }
            });*/
            //Configure all processes
            _.forEach($scope.processes, function (value, key) {
                value.process.configure({
                });
            });
            //Execute chose processes
            _.forEach($scope.processes, function (value, key) {
                if (value.execute) {
                    value.process.executeOnly({
                    });
                    /*var area = $scope.wpsClient.getProcess('server', 'JTS:area');
                    area.configure({
                        inputs: {
                            geom: OpenLayers.Geometry.fromWKT(
                                                                            'POLYGON((110 20,120 20,120 10,110 10,110 20),(112 17,118 18,118 16,112 15,112 17))'
                                                                        )
                        }
                    });
                    value.process.execute({
                        inputs: {
                            geom: OpenLayers.Geometry.fromWKT(
                                          'POLYGON((110 20,120 20,120 10,110 10,110 20),(112 17,118 18,118 16,112 15,112 17))'
                                      ),
                                      distance: area.output()
                        },
                        success: function (outputs) {
                            alert(outputs);
                        }
                    });*/
                }
            });
            /*var output = process.processOutputs[0];
            var input;
            // remove occurrences that the user has not filled out
            for (var i=process.dataInputs.length-1; i>=0; --i) {
                input = process.dataInputs[i];
                if ((input.minOccurs === 0 || input.occurrence) && !input.data && !input.reference) {
                    OpenLayers.Util.removeItem(process.dataInputs, input);
                }
            }
            process.responseForm = {
                rawDataOutput: {
                    identifier: output.identifier
                }
            };
            if (output.complexOutput && output.complexOutput.supported.formats["application/wkt"]) {
                process.responseForm.rawDataOutput.mimeType = "application/wkt";
            }
            OpenLayers.Request.POST({
                url: $scope.wpsUrl,
                data: new OpenLayers.Format.WPSExecute().write(process),
                success: showOutput
            });*/
        };
        angular.element(document).ready(function () {
            map.render('map');
            map.zoomTo(1);
        });
        $scope.$on("CenterPaneFullWidthChange", function (event, fullWidth) {
            map.updateSize();
        });
    }]);

OpenLayers.ProxyHost = "cors/";

var capabilities, // the capabilities, read by Format.WPSCapabilities::read
    process; // the process description from Format.WPSDescribeProcess::read

// create the UI
var layer = new OpenLayers.Layer.Vector("Scratchpad");
var toolbar = new OpenLayers.Control.EditingToolbar(layer);
toolbar.addControls([new OpenLayers.Control.ModifyFeature(layer, {
    title: "Select feature"
})]);
var map = new OpenLayers.Map({
    controls: [
        toolbar,
        new OpenLayers.Control.ZoomPanel(),
        new OpenLayers.Control.PanPanel()
    ],
    layers: [
        new OpenLayers.Layer.WMS(
            "OSM", "http://maps.opengeo.org/geowebcache/service/wms",
            {layers: "openstreetmap", format: "image/png"}
        ), layer
    ]
});
/*
// dynamically create a form from the process description
function buildForm() {
    document.getElementById("abstract").innerHTML = process["abstract"];
    document.getElementById("input").innerHTML = "<h3>Input:</h3>";
    document.getElementById("output").innerHTML = "";

    var inputs = process.dataInputs,
        supported = true,
        sld = "text/xml; subtype=sld/1.0.0",
        input;
    for (var i=0,ii=inputs.length; i<ii; ++i) {
        input = inputs[i];
        if (input.complexData) {
            var formats = input.complexData.supported.formats;
            if (formats["application/wkt"]) {
                addWKTInput(input);
            } else if (formats["text/xml; subtype=wfs-collection/1.0"]) {
                addWFSCollectionInput(input);
            } else if (formats["image/tiff"]) {
                addRasterInput(input);
            } else if (formats[sld]) {
                addXMLInput(input, sld);
            } else if (formats["text/plain; subtype=cql"]) {
                addCQLInput(input);
            } else {
                supported = false;
            }
        } else if (input.boundingBoxData) {
            addBoundingBoxInput(input);
        } else if (input.literalData) {
            addLiteralInput(input);
        } else {
            supported = false;
        }
        if (input.minOccurs > 0) {
            document.getElementById("input").appendChild(document.createTextNode("* "));
        }
    }

    if (supported) {
        document.getElementById('executeButton').disabled=false;
    } else {
        document.getElementById('executeButton').disabled=true;
        document.getElementById("input").innerHTML = '<span class="notsupported">' +
            "Sorry, the WPS builder does not support the selected process." +
            "</span>";
    }
}

// helper function to dynamically create a textarea for geometry (WKT) data
// input
function addWKTInput(input, previousSibling) {
    var name = input.identifier;
    var container = document.getElementById("input");
    var label = document.createElement("label");
    label["for"] = name;
    label.title = input["abstract"];
    label.innerHTML = name + " (select feature, then click field):";
    previousSibling && previousSibling.nextSibling ?
        container.insertBefore(label, previousSibling.nextSibling) :
        container.appendChild(label);
    var field = document.createElement("textarea");
    field.onclick = function () {
        if (layer.selectedFeatures.length) {
            this.innerHTML = new OpenLayers.Format.WKT().write(
                layer.selectedFeatures[0]
            );
        }
        createCopy(input, this, addWKTInput);
    };
    field.onblur = function () {
        input.data = field.value ? {
            complexData: {
                mimeType: "application/wkt",
                value: this.value
            }
        } : undefined;
    };
    field.title = input["abstract"];
    field.id = name;
    previousSibling && previousSibling.nextSibling ?
        container.insertBefore(field, previousSibling.nextSibling.nextSibling) :
        container.appendChild(field);
}

// helper function for xml input
function addXMLInput(input, type) {
    var name = input.identifier;
    var field = document.createElement("input");
    field.title = input["abstract"];
    field.value = name + " (" + type + ")";
    field.onblur = function () {
        input.data = field.value ? {
            complexData: {
                mimeType: type,
                value: this.value
            }
        } : undefined;
    };
    document.getElementById("input").appendChild(field);
}

// helper function for cql input
function addCQLInput(input) {
    var name = input.identifier;
    var field = document.createElement("input");
    field.title = input["abstract"];
    field.value = name + " (CQL)";
    field.onblur = function () {
        input.data = field.value ? {
            complexData: {
                mimeType: 'text/plain; subtype=cql',
                value: this.value
            }
        } : undefined;
    };
    document.getElementById("input").appendChild(field);
}

// helper function to dynamically create a WFS collection reference input
function addWFSCollectionInput(input) {
    var name = input.identifier;
    var field = document.createElement("input");
    field.title = input["abstract"];
    field.value = name + " (layer on server)";
    addValueHandlers(field, function () {
        input.reference = field.value ? {
            mimeType: "text/xml; subtype=wfs-collection/1.0",
            href: "http://geoserver/wfs",
            method: "POST",
            body: {
                wfs: {
                    version: "1.0.0",
                    outputFormat: "GML2",
                    featureType: field.value
                }
            }
        } : undefined;
    });
    document.getElementById("input").appendChild(field);
}

// helper function to dynamically create a raster (GeoTIFF) url input
function addRasterInput(input) {
    var name = input.identifier;
    var field = document.createElement("input");
    field.title = input["abstract"];
    var url = window.location.href.split("?")[0];
    field.value = url.substr(0, url.lastIndexOf("/")+1) + "data/tazdem.tiff";
    document.getElementById("input").appendChild(field);
    field.onblur = function () {
        input.reference = {
            mimeType: "image/tiff",
            href: field.value,
            method: "GET"
        };
    };
    field.onblur();
}

// helper function to dynamically create a bounding box input
function addBoundingBoxInput(input) {
    var name = input.identifier;
    var field = document.createElement("input");
    field.title = input["abstract"];
    field.value = "left,bottom,right,top (EPSG:4326)";
    document.getElementById("input").appendChild(field);
    addValueHandlers(field, function () {
        input.boundingBoxData = {
            projection: "EPSG:4326",
            bounds: OpenLayers.Bounds.fromString(field.value)
        };
    });
}

// helper function to create a literal input textfield or dropdown
function addLiteralInput(input, previousSibling) {
    var name = input.identifier;
    var container = document.getElementById("input");
    var anyValue = input.literalData.anyValue;
    // anyValue means textfield, otherwise we create a dropdown
    var field = document.createElement(anyValue ? "input" : "select");
    field.id = name;
    field.title = input["abstract"];
    previousSibling && previousSibling.nextSibling ?
        container.insertBefore(field, previousSibling.nextSibling) :
        container.appendChild(field);
    if (anyValue) {
        var dataType = input.literalData.dataType;
        field.value = name + (dataType ? " (" + dataType + ")" : "");
        addValueHandlers(field, function () {
            input.data = field.value ? {
                literalData: {
                    value: field.value
                }
            } : undefined;
            createCopy(input, field, addLiteralInput);
        });
    } else {
        var option;
        option = document.createElement("option");
        option.innerHTML = name;
        field.appendChild(option);
        for (var v in input.literalData.allowedValues) {
            option = document.createElement("option");
            option.value = v;
            option.innerHTML = v;
            field.appendChild(option);
        }
        field.onchange = function () {
            createCopy(input, field, addLiteralInput);
            input.data = this.selectedIndex ? {
                literalData: {
                    value: this.options[this.selectedIndex].value
                }
            } : undefined;
        };
    }
}

// if maxOccurs is > 1, this will add a copy of the field
function createCopy(input, field, fn) {
    if (input.maxOccurs && input.maxOccurs > 1 && !field.userSelected) {
        // add another copy of the field - we don't check maxOccurs
        field.userSelected = true;
        var newInput = OpenLayers.Util.extend({}, input);
        // we recognize copies by the occurrence property
        newInput.occurrence = (input.occurrence || 0) + 1;
        process.dataInputs.push(newInput);
        fn(newInput, field);
    }
}

// helper function for adding events to form fields
function addValueHandlers(field, onblur) {
    field.onclick = function () {
        if (!this.initialValue) {
            this.initialValue = this.value;
            this.value = "";
        }
    };
    field.onblur = function () {
        if (!this.value) {
            this.value = this.initialValue;
            delete this.initialValue;
        }
        onblur.apply(this, arguments);
    };
}

// add the process's output to the page
function showOutput(response) {
    var result = document.getElementById("output");
    result.innerHTML = "<h3>Output:</h3>";
    var features;
    var contentType = response.getResponseHeader("Content-Type");
    if (contentType == "application/wkt") {
        features = new OpenLayers.Format.WKT().read(response.responseText);
    } else if (contentType == "text/xml; subtype=wfs-collection/1.0") {
        features = new OpenLayers.Format.WFST.v1_0_0().read(response.responseText);
    }
    if (features && (features instanceof OpenLayers.Feature.Vector || features.length)) {
        layer.addFeatures(features);
        result.innerHTML += "The result should also be visible on the map.";
    }
    result.innerHTML += "<textarea>" + response.responseText + "</textarea>";
}
*/