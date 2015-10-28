/**
 * The (Omar) imagery plugin does not pull layer configuration from the target geoserver.
 * Instead, it uses a configuration object in the global CONFIG.
 *
 * We have the following expectations about CONFIG.imagery.omar:
 *   The overall structure is:
 *      CONFIG.imagery.omar = {
 *        defaultTime // optional, more below
 *        servers: [ {//server, more below} ]
 *        metadata: // more below
 *      }
 *   The defaultTime object (optional), should have 2 parameters, if it is present:
 *      defaultTime: {
 *        diff: {int} // how many units to back up from 'now' for the start time
 *        diffUnits: {string} // the units for diff (e.g., "years", "hours")
 *      }
 *      If the defaultTime is present, it is used to pre-populate the time chooser.
 *      Ideally this will be cleaned up and/or standardized in a few places,
 *         the current behavior is a convenient stopgap.
 *   The CONFIG.server list is a list of server config objects, as suggested by the following:
 *      CONFIG.imagery.omar.servers = [{
 *        name: {string}
 *              // the name to show in the dropdown on the first card of the wizard
 *        wfsUrl: {string}
 *              // the url for the WFS query to find matching imagery
 *        wmsUrl: {string}
 *              // the WMS url (base) for showing an image on the map
 *        imgUrl: {string}
 *              // a url template for retrieving an image thumbnail. more on this below
 *        typeName: {string}
 *              // the feature type name for the wfs query
 *        format: {string} (optional)
 *              // the outputFormat field for the WFS query, defaults to <null> (server chooses)
 *        geomField: {string}
 *              // name for the geometry attribute for the WFS query
 *        dtgField: {string}
 *              // name for the datetime attribute for the WFS query
 *        idField: {string}
 *              // name of the attribute giving a unique for an image result
 *        nameField: {string} (optional)
 *              // name of the attribute giving the display name (title) for an image. defaults to idField
 *        requiresFlip: {boolean}
 *              // does the WFS query result require coordinates to be flipped?
 *        parser: {string}
 *              // either "GML" to use StealthGML2 parser (extends ol.format.GML2), or we use ol.format.GeoJson
 *        dtgFieldIsString: {boolean} (optional)
 *              // treat the datetime attribute as a date for cql expressions (defaults to false)
 *        dtgFieldFormat: {string} (optional)
 *              // for string-y datetimes, specify an alternate format (default is ISO)
 *        dtgFieldFormatUTC: {boolean} (optional)
 *              // for string-y datetimes, specify if the datetime should be formatted in UTC (default: true)
 *        wfsFilterParamName: {string} (optional)
 *              // name of the WFS argument for the filter (defaults to cql_filter)
 *        dropKeys: {list[string]} (optional)
 *              // list of attribute to not show in the image results panel, defaults to []
 *      }]
 *      The imgUrl attribute is taken as a template, populated with angular's $interpolate. The scope for $interpolate
 *        is an object {im: image}, where image is the simple feature. To retrieve attributes of the image, use .get.
 *        For example, "http://thumbnails.com/{{im.get('id')}}" will retrieve the 'id' attribute of the image feature,
 *        and use it to populate the url.
 *   The metadata object must have the following structure:
 *      CONFIG.imagery.omar.metadata = { fields: {
 *        a: // field object, more below
 *        b: c: d: e: f: // also all field objects. that is, field[x] exists for x = 'a' through 'f'
 *      }}
 *      Each field object has two components:
 *        CONFIG.imagery.omar.metadata.fields.a = {
 *          name: {string} // the attribute name for the field
 *          display: {string} // what to show for the attribute, in the wizard
 *        }
 */
angular.module('stealth.imagery.omar', [
    'stealth.core.startmenu',
    'stealth.imagery.omar.runner', // not used below, but we need to load it to it registers the event listener
    'stealth.imagery.omar.wizard'
])

.run([
'toastr',
'CONFIG',
'startMenuManager',
'stealth.imagery.omar.wizard',
function (toastr, CONFIG, startMenuManager, omarWizard) {
    if (_.has(CONFIG, 'imagery.omar')) {
        startMenuManager.addButton('OMAR Search', 'fa-image', omarWizard.launchWizard);
    } else {
        toastr.error('This plugin will not be available.', 'OMAR plugin mis-configured', {timeOut: 0, extendedTimeOut: 0});
    }
}])
;
