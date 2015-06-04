var STEALTH = {
    config: {
        app: {
            context: 'test'
        },
        map: {
            extent: [-180, -90, 180, 90],
            initExtent: [-180, -90, 180, 90],
            projection: 'EPSG:4326',
            clicksearch: {
                strategy: 'bbox-fixed'
            }
        },
        geoserver: {
            omitProxy: false
        }
    }
};
