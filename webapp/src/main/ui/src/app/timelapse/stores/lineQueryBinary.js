angular.module('stealth.timelapse.stores', [
    'stealth.core.geo.ows',
    'stealth.core.utils'
])

.factory('stealth.timelapse.stores.LineQueryBinStore', [
'$log',
'$rootScope',
'$filter',
'$window',
'toastr',
'cqlHelper',
'wfs',
'stealth.timelapse.stores.BinStore',
'CONFIG',
function ($log, $rootScope, $filter, $window, toastr, cqlHelper, wfs, BinStore, CONFIG) {
    var LineQueryBinStore = function () {
        BinStore.apply(this, arguments);

        var _thisStore = this;
        var _viewState = this.getViewState();
        var _query;

        this.getQuery = function () { return _query; };

        this.buildSpaceTimeFilter = function () {
            var query = this.getQuery();
            var params = query.params;
            return cqlHelper.combine(cqlHelper.operator.AND,
                cqlHelper.buildBboxFilter(params.geomField.name, [
                    params.minLon,
                    params.minLat,
                    params.maxLon,
                    params.maxLat]),
                cqlHelper.combine(cqlHelper.operator.AND,
                    cqlHelper.buildDtgFilter(params.startDtgField.name,
                        null, params.endDtg,
                        params.startDtgField.isString, params.startDtgField.dtgFormatter),
                    cqlHelper.buildDtgFilter(params.endDtgField.name,
                        params.startDtg, null,
                        params.endDtgField.isString, params.endDtgField.dtgFormatter)),
                params.cql
            );
        };

        this.buildGetFeatureOverrides = function () {
            var query = this.getQuery();
            var geom = query.params.geomField.name;
            var dtg = query.params.dtgField.name;
            var startDtg = query.params.startDtgField.name;
            var endDtg = query.params.endDtgField.name;
            var id = query.params.idField.name;
            var label = query.layerData.currentLayer.fieldNames.label;
            return {
                propertyName: _.compact([dtg, startDtg, endDtg, geom, id, label]).join(),
                outputFormat: 'application/vnd.binary-viewer',
                format_options: 'geom:' + geom + ';dtg:' + dtg + ';trackId:' + id + (label ? ';label:' + label : '') +
                    (query.params.sortOnServer ? ';sort=true' : ''),
                cql_filter: this.buildSpaceTimeFilter()
            };
        };

        this.launchQuery = function (query) {
            _query = query;
            var typeName = query.layerData.currentLayer.Name;
            var responseType = 'arraybuffer';

            wfs.getFeature(CONFIG.geoserver.defaultUrl, typeName, CONFIG.geoserver.omitProxy, this.buildGetFeatureOverrides(), responseType)
            .success(function (data, status, headers, config, statusText) { //eslint-disable-line no-unused-vars
                var contentType = headers('content-type');
                if (contentType.indexOf('xml') > -1) {
                    $log.error('(' + _thisStore.getName() + ') ows:ExceptionReport returned');
                    $log.error(data);
                    _viewState.isError = true;
                    _viewState.errorMsg = 'ows:ExceptionReport returned';
                    toastr.error(_viewState.errorMsg, 'Error: ' + _thisStore.getName());
                } else if (data.byteLength === 0) {
                    $log.error('(' + _thisStore.getName() + ') No results');
                    _viewState.isError = true;
                    _viewState.errorMsg = 'No results';
                    toastr.error(_viewState.errorMsg, 'Error: ' + _thisStore.getName());
                } else {
                    _thisStore.setArrayBuffer(data, query.params.sortOnServer, function () {
                        $rootScope.$emit('timelapse:querySuccessful');
                    });
                }
            })
            .error(function (data, status, headers, config, statusText) { //eslint-disable-line no-unused-vars
                var msg = 'HTTP status ' + status + ': ' + statusText;
                $log.error('(' + _thisStore.getName() + ') ' + msg);
                _viewState.isError = true;
                _viewState.errorMsg = msg;
                toastr.error(_viewState.errorMsg, 'Error: ' + _thisStore.getName());
            });
        };

        this.exportFormats = {
            'Binary': 'bin'
        };
        this.exportBin = function (outputFormat) {
            //Default is bin format.  Don't requery for bin format.
            if (!_.isString(outputFormat) || outputFormat === 'bin') {
                var blob = new Blob([this.getArrayBuffer()], {type: 'application/octet-binary'});
                saveAs(blob, this.getName().trim().replace(/\W/g, '_') + '.bin');
            } else {
                var url = $filter('cors')(CONFIG.geoserver.defaultUrl, 'wfs', CONFIG.geoserver.omitProxy);
                $window.open(url + '?' + [
                    'service=WFS',
                    'version=1.0.0',
                    'request=GetFeature',
                    'typeName=' + _query.layerData.currentLayer.Name,
                    'srsName=EPSG:4326',
                    'outputFormat=' + outputFormat,
                    'cql_filter=' + _thisStore.buildSpaceTimeFilter(_query.params)
                ].join('&'));
            }
        };
    };

    LineQueryBinStore.prototype = Object.create(BinStore.prototype);

    return LineQueryBinStore;
}])
;
