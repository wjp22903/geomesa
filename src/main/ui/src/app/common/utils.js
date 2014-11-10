angular.module('stealth.common.utils', [
])

.constant('Utils', {
    brightColorList: [
        '#FF0000',
        '#0066FF',
        '#00FF00',
        '#FF9900',
        '#9933FF',
        '#FF3399',
        '#CC6600',
        '#FFFF00',
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
