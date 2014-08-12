angular.module('stealth.common.control.airTrackInfoControl', [
    'stealth.ows.airTrackHistory'
])

.factory('AirTrackInfo', ['AirTrackHistory', function (AirTrackHistory) {
    // Custom control that displays info about track and provides
    // a way to query the history of the selected track.
    var AirTrackInfoControl = L.Control.extend({
        options: {
            position: 'topright',
            autoZIndex: true
        },

        initialize: function (options) {
            L.setOptions(this, options);
            this._feature = {};
            this._style = {};
        },

        onAdd: function (map) {
            this._initLayout();

            return this._container;
        },

        _initLayout: function() {
            this._container = L.DomUtil.create('div', 'air-tracker-control');
            var className = 'air-track-info-control';
            this._controlDiv = L.DomUtil.create('div', className, this._container);
            this._controlDiv.innerHTML = '<h4>Track Information</h4>' +
                '<br><p>Click on a track.</p>';

            this._table = L.DomUtil.create('table', className + '-table');

            this._button = L.DomUtil.create('button',
                                            className + '-button' + ' ' +
                                            'btn btn-primary');
            L.DomEvent.addListener(this._button, 'click', function () {
                AirTrackHistory.initiateQuery(this._feature, this._style);
            }, this);
        },

        _updateTable: function (content) {
            if (!this._controlDiv) {
                return;
            }

            this._table.innerHTML = '<tr>';
            for (var key in content) {
                if (content.hasOwnProperty(key)) {
                    this._table.innerHTML +=
                        '<td>' + key + '</td>' +
                        '<td>' + content[key] + '</td>';
                }
            }
            this._table.innerHTML += '</tr>';
            this._controlDiv.appendChild(this._table);
        },

        update: function (feature, style) {
            this._controlDiv.innerHTML = '<h4>Track Information</h4>';
            this._feature = feature || {properties: {}};
            this._style = style || {};
            this._updateTable(this._feature.properties);
            this._button.innerHTML = 'Get track history';
            this._controlDiv.appendChild(this._button);
        }
    });

    var createControl = function () {
        return new AirTrackInfoControl();
    };

    return {
        createControl: createControl
    };
}])
;
