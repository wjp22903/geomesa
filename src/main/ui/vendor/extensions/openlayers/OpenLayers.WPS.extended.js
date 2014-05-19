/**
 * Developed and tested only against OpenLayers 2.13.1
 */

OpenLayers.CcriWPSProcess = OpenLayers.Class(OpenLayers.WPSProcess, {

    /**
     * Constructor: OpenLayers.Ccri.WPSProcess
     *
     * Parameters:
     * options - {Object} Object whose properties will be set on the instance.
     *
     * Available options:
     * client - {<OpenLayers.Ccri.WPSClient>} Mandatory. Client that manages this
     *     process.
     * server - {String} Mandatory. Local client identifier of this process's
     *     server.
     * identifier - {String} Mandatory. Process identifier known to the server.
     */
    initialize: function(options) {
        OpenLayers.WPSProcess.prototype.initialize.apply(this, [options]);
        OpenLayers.Util.extend(this.formats, {
            //'text/plain; subtype=cql': new OpenLayers.Format.CQL()
        });
    },

    /**
     * APIMethod: configure
     * Configure the process, but do not execute it. Use this for processes
     * that are chained as input of a different process by means of the
     * <output> method.
     *
     * Parameters:
     * options - {Object}
     *
     * Returns:
     * {<OpenLayers.WPSProcess>} this process.
     *
     * Available options:
     * inputs - {Object} The inputs for the process, keyed by input identifier.
     *     For spatial data inputs, the value of an input is usually an
     *     <OpenLayers.Geometry>, an <OpenLayers.Feature.Vector> or an array of
     *     geometries or features.
     * callback - {Function} Callback to call when the configuration is
     *     complete. Optional.
     * scope - {Object} Optional scope for the callback.
     */
    configure: function(options) {
        this.describe({
            callback: function() {
                var description = this.description,
                    inputs = options.inputs,
                    input, i, ii;
                for (i=0, ii=description.dataInputs.length; i<ii; ++i) {
                    input = description.dataInputs[i];
                    if (inputs[input.identifier]) {
                        this.setInputData(input, inputs[input.identifier]);
                    }
                }
                //Remove occurrences that the user has not filled out
                for (i=description.dataInputs.length-1; i>=0; --i) {
                    input = description.dataInputs[i];
                    if ((input.minOccurs === 0 || input.occurrence) && !input.data && !input.reference) {
                        OpenLayers.Util.removeItem(description.dataInputs, input);
                    }
                }
                if (options.callback) {
                    options.callback.call(options.scope);
                }
            },
            scope: this
        });
        return this;
    },

    executeOnly: function(options) {
        var me = this;
        //TODO For now we only deal with a single output
        var outputIndex = this.getOutputIndex(
            me.description.processOutputs, options.output
        );
        me.setResponseForm({outputIndex: outputIndex});
        (function callback() {
            OpenLayers.Util.removeItem(me.executeCallbacks, callback);
            if (me.chained !== 0) {
                // need to wait until chained processes have a
                // description and configuration - see chainProcess
                me.executeCallbacks.push(callback);
                return;
            }
            // all chained processes are added as references now, so
            // let's proceed.
            OpenLayers.Request.POST({
                url: me.client.servers[me.server].url,
                data: new OpenLayers.Format.WPSExecute().write(me.description),
                success: function(response) {
                    if (options.success) {
                        var output = me.description.processOutputs[outputIndex];
                        if (output.complexOutput) {
                            var mimeType = me.findMimeType(
                                output.complexOutput.supported.formats
                            );
                            //TODO For now we assume a spatial output
                            var features;
                            if (mimeType) {
                                features = me.formats[mimeType].read(response.responseText);
                                if (features instanceof OpenLayers.Feature.Vector) {
                                    features = [features];
                                }
                            }
                        }
                        var outputs = {};
                        outputs.identifier = output.identifier;
                        outputs[options.output || 'result'] = response.responseText;
                        if (features) outputs.features = features;
                        options.success.call(options.scope, outputs);
                    }
                },
                scope: me
            });
        })();
    },

    /**
     * APIMethod: execute
     * Configures and executes the process
     *
     * Parameters:
     * options - {Object}
     *
     * Available options:
     * inputs - {Object} The inputs for the process, keyed by input identifier.
     *     For spatial data inputs, the value of an input is usually an
     *     <OpenLayers.Geometry>, an <OpenLayers.Feature.Vector> or an array of
     *     geometries or features.
     * output - {String} The identifier of the output to request and parse.
     *     Optional. If not provided, the first output will be requested.
     * success - {Function} Callback to call when the process is complete.
     *     This function is called with an outputs object as argument, which
     *     will have a property with the identifier of the requested output
     *     (or 'result' if output was not configured). For processes that
     *     generate spatial output, the value will be an array of
     *     <OpenLayers.Feature.Vector> instances.
     * scope - {Object} Optional scope for the success callback.
     */
    execute: function(options) {
        this.configure({
            inputs: options.inputs,
            callback: function() {
                var me = this;
                //TODO For now we only deal with a single output
                var outputIndex = this.getOutputIndex(
                    me.description.processOutputs, options.output
                );
                me.setResponseForm({outputIndex: outputIndex});
                (function callback() {
                    OpenLayers.Util.removeItem(me.executeCallbacks, callback);
                    if (me.chained !== 0) {
                        // need to wait until chained processes have a
                        // description and configuration - see chainProcess
                        me.executeCallbacks.push(callback);
                        return;
                    }
                    // all chained processes are added as references now, so
                    // let's proceed.
                    OpenLayers.Request.POST({
                        url: me.client.servers[me.server].url,
                        data: new OpenLayers.Format.WPSExecute().write(me.description),
                        success: function(response) {
                            var output = me.description.processOutputs[outputIndex];
                            /*var mimeType = me.findMimeType(
                                output.complexOutput.supported.formats
                            );
                            //TODO For now we assume a spatial output
                            var features = me.formats[mimeType].read(response.responseText);
                            if (features instanceof OpenLayers.Feature.Vector) {
                                features = [features];
                            }*/
                            if (options.success) {
                                var outputs = {};
                                outputs[options.output || 'result'] = response.responseText;//features;
                                options.success.call(options.scope, outputs);
                            }
                        },
                        scope: me
                    });
                })();
            },
            scope: this
        });
    },

    /**
     * Method: setInputData
     * Sets the data for a single input
     *
     * Parameters:
     * input - {Object}  An entry from the dataInputs array of the process
     *     description.
     * data - {Mixed} For spatial data inputs, this is usually an
     *     <OpenLayers.Geometry>, an <OpenLayers.Feature.Vector> or an array of
     *     geometries or features.
     */
    setInputData: function(input, data) {
        // clear any previous data
        delete input.data;
        delete input.reference;
        if (data instanceof OpenLayers.WPSProcess.ChainLink) {
            ++this.chained;
            input.reference = {
                method: 'POST',
                href: data.process.server === this.server ?
                    this.localWPS : this.client.servers[data.process.server].url
            };
            data.process.describe({
                callback: function() {
                    --this.chained;
                    this.chainProcess(input, data);
                },
                scope: this
            });
        } else {
            input.data = data;
            /*input.data = {};
            var complexData = input.complexData;
            if (complexData) {
                var format = this.findMimeType(complexData.supported.formats);
                input.data.complexData = {
                    mimeType: format,
                    value: this.formats[format].write(this.toFeatures(data))
                };
            } else {
                input.data.literalData = {
                    value: data
                };
            }*/
        }
    },

    /**
     * Method: setResponseForm
     * Sets the responseForm property of the <execute> payload.
     *
     * Parameters:
     * options - {Object} See below.
     *
     * Available options:
     * outputIndex - {Integer} The index of the output to use. Optional.
     * supportedFormats - {Object} Object with supported mime types as key,
     *     and true as value for supported types. Optional.
     */
    setResponseForm: function(options) {
        options = options || {};
        var output = this.description.processOutputs[options.outputIndex || 0];
        this.description.responseForm = {
            rawDataOutput: {
                identifier: output.identifier
            }
        };
        if (output.complexOutput) {
            this.description.responseForm.rawDataOutput.mimeType = this.findMimeType(output.complexOutput.supported.formats, options.supportedFormats);
        }
    },

    CLASS_NAME: "OpenLayers.CcriWPSProcess"
});

OpenLayers.CcriWPSClient = OpenLayers.Class(OpenLayers.WPSClient, {

    /**
     * Constructor: OpenLayers.Ccri.WPSClient
     *
     * Parameters:
     * options - {Object} Object whose properties will be set on the instance.
     *
     * Avaliable options:
     * servers - {Object} Mandatory. Service metadata, keyed by a local
     *     identifier. Can either be a string with the service url or an
     *     object literal with additional metadata:
     *
     *     (code)
     *     servers: {
     *         local: '/geoserver/wps'
     *     }, {
     *         opengeo: {
     *             url: 'http://demo.opengeo.org/geoserver/wps',
     *             version: '1.0.0'
     *         }
     *     }
     *     (end)
     *
     * lazy - {Boolean} Optional. Set to true if DescribeProcess should not be
     *     requested until a process is fully configured. Default is false.
     */
    initialize: function(options) {
        OpenLayers.WPSClient.prototype.initialize.apply(this, [options]);
    },

    /**
     * APIMethod: getProcess
     * Creates an <OpenLayers.Ccri.WPSProcess>.
     *
     * Parameters:
     * serverID - {String} Local identifier from the servers that this instance
     *     was constructed with.
     * processID - {String} Process identifier known to the server.
     *
     * Returns:
     * {<OpenLayers.Ccri.WPSProcess>}
     */
    getProcess: function(serverID, processID) {
        var process = new OpenLayers.CcriWPSProcess({
            client: this,
            server: serverID,
            identifier: processID
        });
        if (!this.lazy) {
            process.describe();
        }
        return process;
    },

    CLASS_NAME: "OpenLayers.CcriWPSClient"

});