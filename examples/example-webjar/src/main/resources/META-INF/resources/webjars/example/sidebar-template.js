angular.module('templates-app', [
    'example/sidebar.tpl.html'
])

angular.module("example/sidebar.tpl.html", [])
.run(["$templateCache", function($templateCache) {
    $templateCache.put("example/sidebar.tpl.html",
        '<div class="example-sidebar-panel anchorAll">\n' +
        '    <div>The example works!</div>\n' +
        '    <iframe class="anchorLeft anchorRight" src="webjars/example/public/example.ssp"></iframe>\n' +
        '</div>\n' +
        '');
}]);
;
