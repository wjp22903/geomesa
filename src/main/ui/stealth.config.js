// Project configuration.
//
module.exports = {

    // The location of the html page that will be built.
    // Change if needed...
    indexDest: 'WEB-INF/views/index.ssp',

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
            'vendor/bower/angular-mocks/angular-mocks.js'
        ]
    },

    // A list of vendor files needed for development. As you add new libraries
    // add a path to the files here. The 'index' task will append script tag
    // for them to 'indexDest' file specified above.
    vendorFiles: {
        js: [
            'vendor/bower/d3/d3.min.js',
            'vendor/bower/lodash/dist/lodash.min.js',
            'vendor/bower/jquery/dist/jquery.js',
            'vendor/bower/jquery/dist/jquery.min.js',
            'vendor/bower/jquery/dist/jquery.min.map',
            'vendor/bower/angular/angular.js',
            'vendor/bower/angular/angular.min.js',
            'vendor/bower/angular/angular.min.js.map',
            'vendor/bower/angular-ui-router/release/angular-ui-router.min.js',
            'vendor/bower/angular-animate/angular-animate.min.js',
            'vendor/bower/angular-animate/angular-animate.min.js.map',
            'vendor/bower/leaflet-dist/leaflet.js',
            'vendor/bower/atmosphere/atmosphere.min.js',
            'vendor/bower/angular-resource/angular-resource.min.js',
            'vendor/bower/angular-resource/angular-resource.min.js.map',
            'vendor/bower/angular-ui-utils/ui-utils.min.js',
            'vendor/bower/momentjs/min/moment.min.js',
            'vendor/bower/angular-ui-bootstrap-bower/ui-bootstrap.min.js',
            'vendor/bower/angular-ui-bootstrap-bower/ui-bootstrap-tpls.min.js',
            'vendor/bower/bowser/bowser.min.js',
            'vendor/bower/flexy-layout/flexy-layout.min.js',
            'vendor/bower/angular-bootstrap-colorpicker/js/bootstrap-colorpicker-module.js',
            'vendor/bower/AngularJS-Toaster/toaster.js',
            'vendor/bower/sonic.js/dist/sonic.min.js',
            'vendor/bower/filereader.js/filereader.js',
            'vendor/bower/FileSaver.js/FileSaver.min.js',
            'vendor/openlayers/OpenLayers.js',
            'vendor/ol3/ol.js',
            // TODO - test only
            'vendor/bower/angular-mocks/angular-mocks.js',
        ],
        assets_nested: [
            'vendor/openlayers/img/*',
            'vendor/openlayers/theme/default/img/*',
            'vendor/openlayers/theme/default/style.css'
        ],
        assets: [
            'vendor/bower/leaflet-dist/images/*',
            'vendor/bower/world.geo.json/countries.geo.json'
        ],
        fonts: [
            'vendor/bower/font-awesome/fonts/*',
            'vendor/bower/bootstrap/fonts/*'
        ]
    }
};
