angular.module('stealth.common.groupCheckbox', [])

    // Based on this SO post: http://bit.ly/1m7NDtu
    .directive('groupCheckbox', function () {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                // The group-checkbox attribute is "layers.selected"
                // "layers" is an array of layer data for a specific workspace.
                // "isSelected" is used to manage selected state.
                var parts = attrs.groupCheckbox.split('.');

                // add the checkbox type attribute?
                element.bind('change', function (e) {

                    scope.$apply(function () {
                        var setValue = element.prop('checked');

                        angular.forEach(scope.$eval(parts[0]), function (v) {
                            v[parts[1]] = setValue;
                        });
                    });

                });

                scope.$watch(parts[0], function (newVal) {
                    var hasTrue,
                        hasFalse;

                    angular.forEach(newVal, function (v) {
                        if(v[parts[1]]) {
                            hasTrue = true;
                        } else {
                            hasFalse = true;
                        }
                    });

                    if(hasTrue && hasFalse) {
                        element.prop('checked', false).prop('indeterminate', true);
                    } else {
                        element.prop('indeterminate', false).prop('checked', hasTrue);
                    }
                }, true);
            }
        };
    });
