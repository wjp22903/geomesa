angular.module('stealth.common.utils', [])
    .constant('Utils', {
        brightColorList: [
            '#FF0000',
            '#0066FF',
            '#00FF00',
            '#FF9900',
            '#9933FF',
            '#FF3399',
            '#CC6600',
            '#FFFF00'
        ],
        webSafeColors: [
            '#0a8300', '#8A5300', '#7400e8', '#d68000', '#00B3FF',
            '#753E80', '#0068FF', '#62A2CE', '#667081',
            '#347D00', '#8E76F6', '#5C7AFF', '#7A3753', '#008EFF',
            '#5128B3', '#00C8F4', '#0D187F', '#00AA93', '#153359', '#133AF1',
            '#009900', '#009933', '#009966', '#009999', '#0099CC', '#0099FF',
            '#00CC00', '#00CC33', '#00CC66', '#00CC99', '#00CCCC', '#00CCFF',
            '#00FF00', '#00FF33', '#00FF66', '#00FF99', '#00FFCC', '#00FFFF',
            '#330000', '#330033', '#330066', '#330099', '#3300CC', '#3300FF',
            '#333300', '#333333', '#333366', '#333399', '#3333CC', '#3333FF',
            '#336600', '#336633', '#336666', '#336699', '#3366CC', '#3366FF',
            '#339900', '#339933', '#339966', '#339999', '#3399CC', '#3399FF',
            '#33CC00', '#33CC33', '#33CC66', '#33CC99', '#33CCCC', '#33CCFF',
            '#33FF00', '#33FF33', '#33FF66', '#33FF99', '#33FFCC', '#33FFFF',
            '#660000', '#660033', '#660066', '#660099', '#6600CC', '#6600FF',
            '#663300', '#663333', '#663366', '#663399', '#6633CC', '#6633FF',
            '#666600', '#666633', '#666666', '#666699', '#6666CC', '#6666FF',
            '#669900', '#669933', '#669966', '#669999', '#6699CC', '#6699FF',
            '#66CC00', '#66CC33', '#66CC66', '#66CC99', '#66CCCC', '#66CCFF',
            '#66FF00', '#66FF33', '#66FF66', '#66FF99', '#66FFCC', '#66FFFF',
            '#990000', '#990033', '#990066', '#990099', '#9900CC', '#9900FF',
            '#993300', '#993333', '#993366', '#993399', '#9933CC', '#9933FF',
            '#996600', '#996633', '#996666', '#996699', '#9966CC', '#9966FF',
            '#999900', '#999933', '#999966', '#999999', '#9999CC', '#9999FF',
            '#99CC00', '#99CC33', '#99CC66', '#99CC99', '#99CCCC', '#99CCFF',
            '#99FF00', '#99FF33', '#99FF66', '#99FF99', '#99FFCC', '#99FFFF',
            '#CC0000', '#CC0033', '#CC0066', '#CC0099', '#CC00CC', '#CC00FF',
            '#CC3300', '#CC3333', '#CC3366', '#CC3399', '#CC33CC', '#CC33FF',
            '#CC6600', '#CC6633', '#CC6666', '#CC6699', '#CC66CC', '#CC66FF',
            '#CC9900', '#CC9933', '#CC9966', '#CC9999', '#CC99CC', '#CC99FF',
            '#CCCC00', '#CCCC33', '#CCCC66',
            '#CCFF00', '#CCFF33', '#CCFF66',
            '#FF0000', '#FF0033', '#FF0066', '#FF0099', '#FF00CC', '#FF00FF',
            '#FF3300', '#FF3333', '#FF3366', '#FF3399', '#FF33CC', '#FF33FF',
            '#FF6600', '#FF6633', '#FF6666', '#FF6699', '#FF66CC', '#FF66FF',
            '#FF9900', '#FF9933', '#FF9966', '#FF9999', '#FF99CC', '#FF99FF',
            '#FFCC00', '#FFCC33', '#FFCC66',
            '#FFFF00'
        ],
        currentBrightColorIndex: 0,
        getBrightColor: function (index) {
            if (this.currentBrightColorIndex >= this.brightColorList.length) {
                this.currentBrightColorIndex = 0;
            }
            return this.brightColorList[_.isNumber(index) ? index : this.currentBrightColorIndex++];
        }
    })

    .filter('startFrom', function () {
        return function (input, start) {
            if (_.isArray(input)) {
                start = +start; //parse to int
                if (start < 0) {
                    start = 0;
                }
                if (start > input.length - 1) {
                    start = input.length;
                }
                return input.slice(start);
            }
            return 0;
        };
    })

;
