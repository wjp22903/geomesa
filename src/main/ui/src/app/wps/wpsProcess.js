angular.module('stealth.wps.wpsProcess', [
])

    .service('WpsProcessService', [function () {
        this.addWktInput = function (input, inputEl) {
            inputEl.append("<span>wkt</span>");
        };
        this.addBoundingBoxInput = function (input, inputEl) {
            inputEl.append("<span>bounding box</span>");
        };
        this.addLiteralInput = function (input, inputEl) {
            inputEl.append("<span>literal</span>");
        };
    }])

    .directive('wpsProcess', ['WpsProcessService', function (WpsProcessService) {
        return {
            restrict: 'E',
            scope: {
                key: '=',
                value: '='
            },
            templateUrl: 'wps/wpsProcess.tpl.html',
            link: function (scope, element, attrs) {
                var inputEl = element.find('div[name=input]'),
                    outputEl = element.find('div[name=output]');
                //inputEl.html("<h4>Input:</h4>");
                outputEl.html("");

                var inputs = scope.value.description.dataInputs,
                    supported = true,
                    sld = "text/xml; subtype=sld/1.0.0",
                    input;
                for (var i=0,ii=inputs.length; i<ii; ++i) {
                    input = inputs[i];
                    /*inputEl.append('<div>' + input.identifier + (input.minOccurs > 0 ? '*' : '') +
                        '&nbsp;&nbsp;<i class="fa fa-info-circle" title="' + input.abstract + '"></i></div>');*/
                    if (input.complexData) {
                        var formats = input.complexData.supported.formats;
                        if (formats["application/wkt"]) {
                            //WpsProcessService.addWktInput(input, inputEl);
                        } else if (formats["text/xml; subtype=wfs-collection/1.0"]) {
                            //addWFSCollectionInput(input);
                        } else if (formats["image/tiff"]) {
                            //addRasterInput(input);
                        } else if (formats[sld]) {
                            //addXMLInput(input, sld);
                        } else if (formats["text/plain; subtype=cql"]) {
                            //addCQLInput(input);
                        } else {
                            //supported = false;
                        }
                    } else if (input.boundingBoxData) {
                        //WpsProcessService.addBoundingBoxInput(input);
                    } else if (input.literalData) {
                        //WpsProcessService.addLiteralInput(input, inputEl);
                    } else {
                        //supported = false;
                    }
                }

                if (!supported) {
                    inputEl.html('<span class="notsupported">' +
                        "Sorry, the WPS builder does not support the selected process." +
                        "</span>");
                }
            }
        };
    }]);
