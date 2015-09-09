angular.module('stealth.core.interaction.dragAndDrop', [
    'stealth.core.geo.ol3.map'
])

.run([
'toastr',
'ol3Map',
'stealth.core.geo.ol3.layers.DroppedLayer',
function (toastr, ol3Map, DroppedLayer) {
    var dragAndDropInteraction = new ol.interaction.DragAndDrop({
        formatConstructors: [
            ol.format.GPX,
            ol.format.GeoJSON,
            ol.format.IGC,
            ol.format.KML,
            ol.format.TopoJSON
        ]
    });

    dragAndDropInteraction.on('addfeatures', function (event) {
        if (_.isEmpty(event.features)) {
            toastr.error('No geographic data found', event.file.name);
        } else {
            ol3Map.addLayer(new DroppedLayer({event: event}));
            toastr.info('Data added to map', event.file.name);
        }
    });

    ol3Map.addInteraction(dragAndDropInteraction);
}])

;
