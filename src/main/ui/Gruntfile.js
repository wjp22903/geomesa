var eyes    = require('eyes'),
    _       = require('lodash');

module.exports = function (grunt) {
    'use strict';

    // Load npm tasks.
    require('matchdep').filterDev('grunt-*').forEach(function (dep) {
        grunt.loadNpmTasks(dep);
    });

    grunt.initConfig(require('./stealth.config.js'));

    // Expand the buildDir pattern to allow glob minimatch patterns in config.
    grunt.config('buildDir', require('../../../target/non-packaged-resources/stealth.config.filtered.js').buildDir);

    // CLEAN
    grunt.config('clean', [
        // '<%= buildDir %>',
        // '<%= compileDir %>'
    ]);

    // COPY
    grunt.config('copy', {
        build_app_assets: {
            files: [{
                src: ['**'],
                dest: '<%= buildDir %>/assets/',
                cwd: 'src/assets',
                expand: true
            }, {
                src: ['**'],
                dest: '<%= buildDir %>/assets/',
                cwd: '../../../target/assets',
                expand: true
            }]
        },
        build_vendor_assets: {
            files: [{
                src: ['<%= vendorFiles.assets %>'],
                dest: '<%= buildDir %>/assets/',
                cwd: '.',
                expand: true,
                flatten: true
            }]
        },
        build_appjs: {
            files: [{
                src: ['<%= appFiles.js %>'],
                dest: '<%= buildDir %>/',
                cwd: '.',
                expand: true
            }]
        },
        build_vendorjs: {
            files: [{
                src: ['<%= vendorFiles.js %>'],
                dest: '<%= buildDir %>/',
                cwd: '.',
                expand: true
            }]
        },
        build_vendorassets_nested: {
            files: [{
                src: ['<%= vendorFiles.assets_nested %>'],
                dest: '<%= buildDir %>/',
                cwd: '.',
                expand: true
            }]
        },
        compile_assets: {
            files: [{
                src: ['**'],
                dest: '<%= compileDir %>/assets',
                cwd: '<%= buildDir %>/assets',
                expand: true
            }]
        }
    });


    // HTML2JS
    grunt.config('html2js', {
        app: {
            options: {
                base: 'src/app'
            },
            src: ['<%= appFiles.tpl %>'],
            dest: '<%= buildDir %>/templates-app.js'
        }
    });

    // INDEX
    grunt.config('index', {
        build: {
            dir: '<%= buildDir %>',
            src: [
                '<%= vendorFiles.js %>',
                '<%= appFiles.js %>',
                // '<%= html2js.common.dest %>',
                '<%= html2js.app.dest %>',
                '<%= stylus.build.dest %>',
                '<%= buildDir %>/templates-jst.js'
            ]
        }
    });

    // JSHINT
    grunt.config('jshint', {
        src: {
            files: [{
                expand: true,
                cwd: '.',
                src: ['<%= appFiles.js %>']
            }]
        },
        specs: [
            '<%= appFiles.specs %>'
        ],
        gruntfile: [
            'Gruntfile.js'
        ],
        options: {
            jshintrc: true
        }
    });

    grunt.config('karmaconfig', {
        spec: {
            src: ['<%= vendorFiles.js %>', '<%= testFiles.js %>', '<%= html2js.app.dest %>', '<%= buildDir %>/templates-jst.js']
        }
    });

    grunt.config('karma', {
        options: {
            configFile: 'karma.conf.js'
        },
        spec: {
            port: 9019,
            background: true
        },
        continuous: {
            singleRun: true
        }
    });

    // STYLUS
    grunt.config('stylus', {
        build: {
            src: ['<%= appFiles.stylus %>'],
            dest: '<%= buildDir %>/css/style.css',
            options: {
                compress: true,
                'include css': true
            }
        }
    });

    // LODASH TEMPLATES
    grunt.config('jst', {
        compile: {
            options: {
                namespace: 'stealth.jst',
                processName: function (filepath) {
                    return filepath.replace(/^src\/templates\//, '').replace(/\.jst/, '');
                },
                templateSettings: {
                    interpolate : /\{\{(.+?)\}\}/g
                }
            },
            files: {
                "<%= buildDir %>/templates-jst.js": ["src/templates/**/*.jst.*"]
            }
        }
    });

    // WATCH
    grunt.config('delta', {
        options: {
            livereload: true
        },
        gruntfile: {
            files: 'Gruntfile.js',
            tasks: ['jshint:gruntfile'],
            options: { livereload: false }
        },
        //build index.html when it changes.
        html: {
            files: ['<%= appFiles.html %>'],
            tasks: ['index:build']
        },
        js: {
            options: {cwd: '.'},
            files: ['<%= appFiles.js %>'],
            tasks: ['jshint:src', 'karma:spec:run', 'copy:build_appjs']
        },
        specs: {
            files: ['<%= appFiles.specs %>'],
            tasks: ['jshint:specs', 'karma:spec:run'],
            options: { livereload: false }
        },
        stylus: {
            files: ['**/*.styl'],
            tasks: ['stylus:build']
        },
        tpls: {
            files: ['<%= appFiles.tpl %>'],
            tasks: ['html2js']
        },
        jst: {
            files: ['src/templates/**/*.jst.*'],
            tasks: ['jst:compile']
        }
    });

    grunt.config('connect', {
        localTestFilesServer: {
            options: {
                port: 9901,
                base: '../../test/ui'
            }
        },
        options: {
            port: 9900,
            hostname: 'localhost',
            debug: true
        },
        dgeo: {
            proxies: [
                {
                    context: ['/geoserver'],
                    host: 'dgeo',
                    port: 8080,
                },
                {
                    context: ['/'],
                    host: 'localhost',
                    port: 9901,
                },
            ]
        },
        geo: {
            appendProxies: false,
            proxies: [{
                context: ['/geoserver'],
                host: 'geo',
                port: 8080
            }]
        },
        livereload: {
            options : {
                middleware: function (connect, options) {
                    var middlewares = [];

                    if (!Array.isArray(options.base)) {
                        options.base = [options.base];
                    }

                    // Enable CORS by setting response headers
                    middlewares.unshift(function(req, res, next) {
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        res.setHeader('Access-Control-Allow-Methods', '*');
                        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
                        return next();
                    });

                    // Setup the proxy
                    middlewares.push(
                        require('grunt-connect-proxy/lib/utils')
                            .proxyRequest);

                    // Serve static files
                    options.base.forEach(function (base) {
                        middlewares.push(connect.static(base));
                    });

                    return middlewares;
                }
            }
        }
    });

    function filterForJS ( files ) {
        return files.filter( function ( file ) {
            return file.match( /\.js$/ );
        });
    }

    function filterForCSS ( files ) {
        return files.filter( function ( file ) {
            return file.match( /\.css$/ );
        });
    }

    // To avoid potential conflicts with Scalate ssp templates,
    // replace template delimiters: <% %> to [% %].
    grunt.template.addDelimiters('squareBrackets', '[%', '%]');

    grunt.registerMultiTask( 'index', 'Process index.html template', function () {
        var dirRE, jsFiles, cssFiles, templates;

        dirRE = new RegExp( '^('+grunt.config('buildDir')+'|'+grunt.config('compileDir')+')\/', 'g' );

        jsFiles = filterForJS( this.filesSrc ).map( function ( file ) {
            return file.replace( dirRE, '' );
        });

        console.log(eyes.inspect(jsFiles));

        cssFiles = filterForCSS( this.filesSrc ).map( function ( file ) {
            return file.replace( dirRE, '' );
        });

        console.log(eyes.inspect(cssFiles));

        templates = ['src/index.html', 'src/browser.html'];
        templates.forEach(function (tpl) {
            var fileName = tpl.split('/').pop().split('.')[0];

            grunt.file.copy(tpl, grunt.config('buildDir') + '/WEB-INF/views/' + fileName + '.ssp', {
                process: function ( contents, path ) {
                    return grunt.template.process( contents, {
                        data: {
                            datetime: grunt.template.today('UTC:yyyymmddHHMM'),
                            scripts: jsFiles,
                            styles: cssFiles
                        },
                        delimiters: 'squareBrackets'
                    });
                }
            });
        });
    });

    grunt.registerMultiTask('karmaconfig', 'Process Karma config templates', function () {
        var jsFiles = filterForJS(this.filesSrc);

        console.log(eyes.inspect(jsFiles));

        grunt.file.copy('karma/karma.conf.tpl.js', 'karma.conf.js', {
            process: function(contents, path) {
                return grunt.template.process(contents, {
                    data: {
                        scripts: jsFiles
                    }
                });
            }
        });
    });

    grunt.renameTask('watch', 'delta');

    // Register tasks.
    grunt.registerTask('watch', ['build', 'karma:spec', 'delta']);
    grunt.registerTask('default', 'build');
    grunt.registerTask('build', [
        // 'clean',
        'html2js',
        'jst:compile',
        'jshint',
        'karmaconfig',
        'karma:continuous',
        'stylus:build',
        'copy:build_app_assets',
        'copy:build_vendor_assets',
        'copy:build_appjs',
        'copy:build_vendorjs',
        'copy:build_vendorassets_nested',
        'index:build'
    ]);

    grunt.registerTask('proxy-dgeo',[
        'configureProxies:dgeo',
        'connect:localTestFilesServer',
        'connect:livereload',
        'watch'
    ]);

    grunt.registerTask('proxy-geo',[
        'configureProxies:geo',
        'connect:livereload'
    ]);
};
