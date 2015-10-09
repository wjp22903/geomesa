/* global require:false */
/* global module:false */
var fs = require('fs');

/* eslint-disable no-invalid-this */
module.exports = function (grunt) {
    'use strict';

    // Load npm tasks.
    require('matchdep').filterDev('grunt*').forEach(function (dep) {
        if (dep !== 'grunt-cli') {
            grunt.loadNpmTasks(dep);
        }
    });

    var target = grunt.option('target') || 'develop';
    var stealthConfig = require('./stealth.config.js');
    if (target === 'production' || target === 'develop') {
        stealthConfig.vendorFiles.js = stealthConfig.vendorFiles.js.map(function (file) {
            var minFile;
            if (file.search(/[\.\-]debug/) !== -1) {
                minFile = file.replace(/[\.\-]debug/, '');
            } else {
                minFile = file.replace(/\.js$/, '.min.js');
            }
            return fs.existsSync(minFile) ? minFile : file;
        });
    }

    grunt.initConfig(stealthConfig);

    // Expand the buildDir pattern to allow glob minimatch patterns in config.
    grunt.config('buildDir', require('../../../target/non-packaged-resources/stealth.config.filtered.js').buildDir);

    // CLEAN
    grunt.config('clean', {
        nonprod_app_js: {
            options: {
                force: true
            },
            files: {
                src: [
                    '<%= html2js.app.dest %>',
                    '<%= buildDir %>/templates-jst.js',
                    '<%= buildDir %>/plugins.js',
                    '<%= buildDir %>/src/'
                ]
            }
        }
    });

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
            }, {
                src: ['<%= vendorFiles.assets_nested %>'],
                dest: '<%= buildDir %>/',
                cwd: '.',
                expand: true
            }, {
                src: ['<%= vendorFiles.fonts %>'],
                dest: '<%= buildDir %>/fonts/',
                cwd: '.',
                expand: true,
                flatten: true
            }, {
                src: ['<%= vendorFiles.css.images %>'],
                dest: '<%= buildDir %>/css/images/',
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
        build_vendor_maps: {
            files: [{
                src: ['<%= vendorFiles.map %>'],
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
    if (target === 'production') {
        grunt.config('appJs', '<%= buildDir %>/app.min.js');
    } else {
        grunt.config('appJs', [
            '<%= appFiles.js %>',
            '<%= html2js.app.dest %>',
            '<%= buildDir %>/templates-jst.js',
            '<%= buildDir %>/plugins.js'
        ]);
    }
    grunt.config('index', {
        build: {
            dir: '<%= buildDir %>',
            src: [
                '<%= appFiles.html %>',
                '<%= vendorFiles.js %>',
                '<%= appJs %>',
                '<%= stylus.build.dest %>'
            ]
        }
    });

    // ESLINT
    grunt.config('eslint', {
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
            rulePaths: ['eslint_rules'],
            silent: target !== 'production'
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
                    interpolate: /\{\{(.+?)\}\}/g,
                    evaluate: /\{%(.+?)%\}/g
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
            livereload: grunt.option('watchPort') || 35729
        },
        gruntfile: {
            files: 'Gruntfile.js',
            tasks: ['eslint:gruntfile'],
            options: {livereload: false}
        },
        //build index.html when it changes.
        html: {
            files: ['<%= appFiles.html %>'],
            tasks: ['index:build']
        },
        js: {
            files: ['<%= appFiles.js %>'],
            tasks: ['eslint:src', 'karma:spec:run', 'copy:build_appjs']
        },
        specs: {
            files: ['<%= appFiles.specs %>'],
            tasks: ['eslint:specs', 'karma:spec:run'],
            options: {livereload: false}
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
        },
        vendor_assets: {
            files: ['<%= vendorFiles.assets_nested %>', '<%= vendorFiles.assets %>', '<%= vendorFiles.fonts %>', '<%= vendorFiles.css.images %>'],
            tasks: ['copy:build_vendor_assets']
        },
        vendor_js: {
            files: ['<%= vendorFiles.js %>', '<%= vendorFiles.map %>'],
            tasks: ['copy:build_vendorjs', 'copy:build_vendor_maps']
        },
        vendor_css: {
            files: ['<%= vendorFiles.css.files %>'],
            tasks: ['stylus:build']
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
                    port: 8080
                },
                {
                    context: ['/'],
                    host: 'localhost',
                    port: 9901
                }
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
            options: {
                middleware: function (connect, options) {
                    var middlewares = [];

                    if (!Array.isArray(options.base)) {
                        options.base = [options.base];
                    }

                    // Enable CORS by setting response headers
                    middlewares.unshift(function (req, res, next) { //eslint-disable-line no-unused-vars
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
                        middlewares.push(connect['static'](base));
                    });

                    return middlewares;
                }
            }
        }
    });

    grunt.config('uglify', {
        options: {
            screwIE8: true,
            banner: '/*\n* COPYRIGHT AND ITAR: This work, authored and owned by Commonwealth Computer\n* Research, Inc. (CCRi), was funded in whole or in part by a U.S. Government\n* contract and is subject to a license granting the Government rights to the\n* work. All other rights are reserved by CCRi as the copyright owner, copyright\n* 2014-2015.  Information included herein is controlled under the International\n* Traffic in Arms Regulations (ITAR).  ITAR protections, laws, and regulations\n* must be observed by any users of this work.\n*/\n'
        },
        build_appjs: {
            files: {
                '<%= buildDir %>/app.min.js': [
                    '<%= appFiles.js %>',
                    '<%= html2js.app.dest %>',
                    '<%= buildDir %>/templates-jst.js',
                    '<%= buildDir %>/plugins.js'
                ]
            }
        }
    });

    function filterForJS (files) {
        return files.filter(function (file) {
            return file.match(/\.js$/);
        });
    }

    function filterForCSS (files) {
        return files.filter(function (file) {
            return file.match(/\.css$/);
        });
    }

    // To avoid potential conflicts with Scalate ssp templates,
    // replace template delimiters: <% %> to [% %].
    grunt.template.addDelimiters('squareBrackets', '[%', '%]');

    grunt.registerMultiTask('index', 'Process index.html template', function () {
        var dirRE, jsFiles, cssFiles, templates;

        dirRE = new RegExp('^('+grunt.config('buildDir')+'|'+grunt.config('compileDir')+')\/', 'g');

        jsFiles = filterForJS(this.filesSrc).map(function (file) {
            return file.replace(dirRE, '');
        });

        cssFiles = filterForCSS(this.filesSrc).map(function (file) {
            return file.replace(dirRE, '');
        });

        templates = this.filesSrc.filter(function (file) {
            return file.match(/\.html\.tpl$/);
        });
        templates.forEach(function (tpl) {
            var fileName = tpl.split('/').pop().split('.')[0];

            grunt.file.copy(tpl, grunt.config('buildDir') + '/WEB-INF/views/' + fileName + '.ssp', {
                process: function (contents) {
                    return grunt.template.process(contents, {
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

        grunt.file.copy('karma/karma.conf.js.tpl', 'karma.conf.js', {
            process: function (contents) {
                return grunt.template.process(contents, {
                    data: {
                        scripts: jsFiles
                    }
                });
            }
        });
    });

    grunt.renameTask('watch', 'delta');

    //Copy or uglify?
    if (target === 'production') {
        grunt.registerTask('build_appjs', [
            'uglify:build_appjs',
            'clean:nonprod_app_js'
        ]);
    } else {
        grunt.registerTask('build_appjs', 'copy:build_appjs');
    }

    // Register tasks.
    grunt.registerTask('watch', ['build', 'karma:spec', 'delta']);
    grunt.registerTask('default', 'build');
    grunt.registerTask('build', [
        'html2js',
        'jst:compile',
        'stylus:build',
        'eslint',
        'karmaconfig',
        'karma:continuous',
        'copy:build_app_assets',
        'copy:build_vendor_assets',
        'build_appjs',
        'copy:build_vendorjs',
        'copy:build_vendor_maps',
        'index:build'
    ]);

    grunt.registerTask('proxy-dgeo', [
        'configureProxies:dgeo',
        'connect:localTestFilesServer',
        'connect:livereload',
        'watch'
    ]);

    grunt.registerTask('proxy-geo', [
        'configureProxies:geo',
        'connect:livereload'
    ]);
};
/* eslint-enable no-invalid-this */
