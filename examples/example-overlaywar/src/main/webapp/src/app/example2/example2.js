angular.module('stealth.example2')

.run([
'$timeout',
function ($timeout) {
    $timeout(function () {
        alert('Example 2 works!!');
    }, 2000);
}])
;
