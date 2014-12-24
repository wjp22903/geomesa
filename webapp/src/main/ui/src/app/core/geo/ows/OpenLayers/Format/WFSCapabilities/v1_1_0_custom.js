OpenLayers.Format.WFSCapabilities.v1_1_0_custom = OpenLayers.Class(
    OpenLayers.Format.WFSCapabilities.v1_1_0, {
        readers: {
            "wfs": OpenLayers.Util.applyDefaults({
                "Name": function(node, obj) {
                    var name = this.getChildValue(node);
                    if (name) {
                        var parts = name.split(":");
                        obj.name = name; //Use full name - original OL v2.13.1 code removed namespace and set name to parts.pop()
                        if(parts.length > 0) {
                            obj.prefix = parts[0]; //original OL v2.13.1 code did not include prefix
                            obj.featureNS = this.lookupNamespaceURI(node, parts[0]);
                        }
                    }
                }
            }, OpenLayers.Format.WFSCapabilities.v1.prototype.readers["wfs"])
        },
        CLASS_NAME: "OpenLayers.Format.WFSCapabilities.v1_1_0_custom"
    }
);
