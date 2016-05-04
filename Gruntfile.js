/*
npm install -g grunt-cli
npm init
npm install grunt grunt-contrib-concat grunt-contrib-requirejs grunt-contrib-uglify grunt-contrib-watch --save-dev
*/


module.exports = function(grunt) {
  
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),    
        concat: {
            options: {
                separator: ';',
            },
            uiprod: {
                src: ['dist/jwebkit.ui.js'],
                dest: '/var/www/dev.jwebdesk.com/js/jwebkit.ui.js',
            },
            wcprod: {
                src: ['dist/jwebkit.wc.js'],
                dest: '/var/www/dev.jwebdesk.com/js/jwebkit.wc.js',
            },
            libprod: {
                src: ['dist/jwebkit.js'],
                dest: '/var/www/dev.jwebdesk.com/js/jwebkit.js',
                dest_prueb: '/var/www/sciencekombat.com/game/template/src/jwebkit/jwk.js',
                dest_engine: '/var/www/html/engine/lib/jwebkit.js',
                dest_jwebdesk: '/var/www/dev.jwebdesk.com/js/jwebkit.js'
            },            
            libengine: {
                src: ['dist/jwebkit.js'],
                dest: '/var/www/html/engine/lib/jwebkit.js'
            },
            ui: {
                src: ['lib/almond.js', 'dist/jwebkit.ui.amd.js', 'lib/suffix.js'],
                dest: 'dist/jwebkit.ui.js',
            },
            wc: {
                src: ['lib/almond.js', 'dist/jwebkit.wc.amd.js', 'lib/suffix.js'],
                dest: 'dist/jwebkit.wc.js',
            },
            lib: {
                src: ['lib/almond.js', 'dist/jwebkit.amd.js', 'lib/suffix.js'],
                //src: ['dist/jwebkit.amd.js'],
                dest: 'dist/jwebkit.js',
            },
            min: {
                src: ['lib/almond.min.js', 'dist/jwebkit.amd.min.js'],
                dest: 'dist/jwebkit.min.js',
            },
            prueba: {
                src: [
                    'src/jwebkit.js'
                ],
                dest: '/var/www/dev.jwebdesk.com/js/jwebkit_prueba.js',
                dest_prueb: '/var/www/sciencekombat.com/game/template/src/jwebkit/jwk.js',
                dest_jwebdesk: '/var/www/dev.jwebdesk.com/js/jwebkit.js'
            },
            
        },
        requirejs: {
            options: { 
                findNestedDependencies: true,
                baseUrl : 'src', 
                name : 'jwebkit',                 
                out : 'dist/jwebkit.amd.js',
                paths: {                    
                    // sugar: "../lib/sugar",
                    Async: "../lib/Async",                
                    treequery: "../bower_components/treequery/dist/treequery",
                    // inner_jquery: "../lib/jquery",
                    // mustache: "../lib/mustache",
                    //less: "../lib/less",
                    md5: "../lib/md5",
                    sha1: "../lib/sha1",
                    sha256: "../lib/sha256",
                    shortcut: "../lib/shortcut-2.01.B",
                    base64: "../lib/webtoolkit.base64"
                }
            },
            ui: { 
                options: { 
                    out : 'dist/jwebkit.ui.amd.js',
                    name : 'jwebkit.ui',
                    optimize : 'none',
                    paths: {                    
                        jquery: "../lib/jquery",
                        // handlebars: "empty:",
                        mustache: "../lib/mustache",
                    }
                } 
            },
            wc: {
                options: { 
                    out : 'dist/jwebkit.wc.amd.js',
                    name : 'jwebkit.wc',
                    optimize : 'none',
                    paths: {                    
                        "jwebkit": 'empty:',
                        "jwebkit.ui": 'empty:',
                        "polymer": 'empty:'
                    }
                } 
            },
            lib: { 
                options: { 
                    out : 'dist/jwebkit.amd.js',
                    optimize : 'none',
                } 
            },
            min: { 
                options: {
                    preserveLicenseComments: false,
                    out : 'dist/jwebkit.amd.min.js',               
                } 
            },
            almondmin: { 
                options: {
                    baseUrl : '.', 
                    name : 'lib/almond.js',                 
                    out : 'lib/almond.min.js',
                    preserveLicenseComments: false,
                }
            }
        },
        watch: {
            files: ["./src/**/*.js", "./src/*.js"],
            tasks: ["default"]
        }

    });    
    
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-watch');
    
    
    grunt.registerTask('default_', [
        // "requirejs:wc",  "concat:wc",   "concat:wcprod",
        "requirejs:lib", "concat:lib",  "concat:libprod", "concat:libengine",
        "requirejs:ui",  "concat:ui",   "concat:uiprod"]);
    grunt.registerTask('develop', ["requirejs:almondmin", "requirejs:lib", "requirejs:ui", "concat:lib", "concat:ui", "concat:libprod", "concat:uiprod"]);
    grunt.registerTask('fast', ["requirejs:lib", "concat:lib", "concat:libprod"]);
    
    grunt.registerTask('lib', ["requirejs:lib", "concat:lib"]);
    grunt.registerTask('ui', ["requirejs:ui", "concat:ui"]);
    grunt.registerTask('wc', ["requirejs:wc",  "concat:wc"]);
    
    grunt.registerTask('default', ["lib","ui"]);
    
    
    grunt.registerTask('prueba', ["concat:prueba"]);
    
    
};