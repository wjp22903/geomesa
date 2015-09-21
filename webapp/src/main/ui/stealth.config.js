// Project configuration.
//
module.exports = {
    // Where project is compiled for deployment.
    compileDir: 'deploy',

    // App file patterns used by the build system.
    appFiles: {
        js : [ 'src/**/*.js', '!src/**/*.spec.js', '!src/assets/**/*.js' ],
        specs: [ 'src/**/*.spec.js' ],
        tpl: [ 'src/app/**/*.tpl.html' ],
        html: [ 'src/*.html.tpl' ],
        stylus: 'src/stylus/main.styl'
    },

    // Dependencies needed for tests.
    testFiles: {
        js: [
            '../../test/testConfig.js',
            'vendor/bower/angular-mocks/angular-mocks.js'
        ]
    },

    // A list of vendor files needed for development. As you add new libraries
    // add a path to the files here. The 'index' task will append script tag
    // for them to 'indexDest' file specified above.
    vendorFiles: {
        js: [
            'vendor/bower/d3/d3.js',
            'vendor/bower/lodash/lodash.js',
            'vendor/bower/jquery/dist/jquery.js',
            'vendor/bower/jquery-ui/jquery-ui.js',
            'vendor/bower/angular/angular.js',
            'vendor/bower/angular-ui-router/release/angular-ui-router.js',
            'vendor/bower/angular-animate/angular-animate.js',
            'vendor/bower/angular-cookies/angular-cookies.js',
            'vendor/bower/angular-ui-utils/ui-utils.js',
            'vendor/bower/momentjs/min/moment.min.js',
            'vendor/bower/angular-ui-bootstrap-bower/ui-bootstrap-tpls.js',
            'vendor/bower/bowser/bowser.js',
            'vendor/bower/angular-truncate/src/truncate.js',
            'vendor/bower/html5slider.polyfill/html5slider.js',
            'vendor/bower/angular-ui-sortable/sortable.js',
            'vendor/bower/angular-bootstrap-colorpicker/js/bootstrap-colorpicker-module.js',
            'vendor/bower/ol3/build/ol-debug.js',
            'vendor/bower/filereader.js/filereader.js',
            'vendor/bower/FileSaver/FileSaver.js',
            'vendor/bower/datetimepicker/jquery.datetimepicker.js',
            'vendor/bower/angular-toastr/dist/angular-toastr.tpls.js',
            'vendor/bower/sonic.js/dist/sonic.js',
            'vendor/bower/mathjs/dist/math.js',
            'vendor/bower/openlayers/OpenLayers.debug.js',
            'vendor/bower/long/dist/Long.js',
            'vendor/bower/isteven-angular-multiselect/isteven-multi-select.js',
            'vendor/bower/css-element-queries/src/ResizeSensor.js'
        ],
        assets_nested: [
        ],
        assets: [
            'vendor/bower/world.geo.json/countries.geo.json'
        ],
        fonts: [
            'vendor/bower/font-awesome/fonts/*',
            'vendor/bower/bootstrap/fonts/*'
        ],
        css: {
            images: [
                'vendor/bower/jquery-ui/themes/smoothness/images/*'
            ]
        },
        map: [
            'vendor/bower/jquery/dist/jquery.min.map',
            'vendor/bower/angular/angular.min.js.map',
            'vendor/bower/angular-animate/angular-animate.min.js.map',
            'vendor/bower/angular-cookies/angular-cookies.min.js.map',
            'vendor/bower/mathjs/dist/math.map'
        ]
    }
};
