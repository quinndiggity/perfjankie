module.exports = function(grunt) {

	var couchdb = require('./test/util').config({
		log: 1
	}).couch;

	grunt.initConfig({
		jshint: {
			all: [
				'Gruntfile.js',
				'lib/*.js',
				'test/**/*.js',
				'www/**/*.js'
			],
			options: {
				jshintrc: '.jshintrc'
			},
		},

		metricsgen: {
			files: {
				dest: 'site/metrics.js'
			}
		},

		uglify: {
			options: {
				mangle: false,
				sourceMap: true,
				sourceMapName: 'site/main.js.map',
			},
			js: {
				files: {
					'site/main.js': ['www/**/*.js', 'site/**/*.js']
				}
			}
		},

		concat: {
			less: {
				src: ['www/app/**/*.less', 'www/assets/css/*.css'],
				dest: 'site/main.less'
			}
		},

		less: {
			dev: {
				files: {
					'site/main.css': 'site/main.less'
				}
			},
			dist: {
				options: {
					compress: true
				},
				files: {
					'site/main.css': 'site/main.less'
				}
			}
		},

		autoprefixer: {
			less: {
				src: 'site/main.css',
				dest: 'site/main.css'
			}
		},

		copy: {
			partials: {
				expand: true,
				cwd: 'www/app',
				src: ['**/*.html'],
				dest: 'site/app'
			},
			fonts: {
				expand: true,
				cwd: 'www/assets',
				src: ['fonts/*.*'],
				dest: 'site/assets'
			},
			endpoints: {
				src: ['www/server/endpoints.js'],
				dest: 'site/server/endpoints.js'
			}
		},

		processhtml: {
			dev: {
				options: {
					strip: true,
					data: {
						scripts: grunt.file.expand({
							cwd: 'www'
						}, 'app/**/*.js'),
					}
				},
				files: {
					'site/index.html': 'www/index.html'
				}
			},
			dist: {
				options: {
					data: {
						scripts: ['main.js']
					}
				},
				files: {
					'site/index.html': 'www/index.html'
				}
			}
		},
		htmlmin: {
			dist: {
				options: {
					removeComments: true,
					collapseWhitespace: true,
					conservativeCollapse: true,
					collapseBooleanAttributes: true
				},
				files: {
					'site/index.html': 'site/index.html'
				}
			},
		},
		connect: {
			proxies: [{
				context: ['/metadata'],
				changeOrigin: false,
				host: 'localhost',
				port: '5984',
				rewrite: {
					'/metadata/_view': '/' + couchdb.database + '/_design/metadata/_view'
				}
			}],
			dev: {
				options: {
					hostname: '*',
					port: 9000,
					base: ['test/res', 'bower_components', 'site', 'www'],
					livereload: true,
					middleware: function(connect, options) {
						var middlewares = [];
						if (!Array.isArray(options.base)) {
							options.base = [options.base];
						}
						middlewares.push(require('grunt-connect-proxy/lib/utils').proxyRequest);
						options.base.forEach(function(base) {
							middlewares.push(connect.static(base));
						});
						return middlewares;
					},
					useAvailablePort: true,
				}
			}
		},
		watch: {
			options: {
				livereload: true,
			},
			views: {
				files: ['couchdb/**/*.js'],
				tasks: ['deployViews']
			},
			less: {
				files: ['www/**/*.less'],
				tasks: ['concat', 'less:dev', 'autoprefixer']
			},
			html: {
				files: ['www/index.html'],
				tasks: ['processhtml:dev']
			},
			others: {
				files: ['www/app/**/*.html', 'www/app/**/*.js'],
				tasks: []
			}
		},

		mochaTest: {
			options: {
				reporter: 'dot',
				timeout: 1000 * 60 * 10
			},
			unit: {
				src: ['test/**/*.spec.js'],
			}
		},
		clean: ['site', 'test.log']
	});

	require('load-grunt-tasks')(grunt);
	require('./tasks/metricsgen')(grunt);

	grunt.registerTask('seedData', function() {
		var done = this.async();
		require('./test/seedData')(done, 100);
	});

	grunt.registerTask('deployViews', function() {
		var done = this.async();
		require('./lib/couchViews')(require('./test/util.js').config(), function(err, res) {
			console.log(err, res);
			done(!err);
		});
	});

	grunt.registerTask('test', ['clean', 'mochaTest']);
	grunt.registerTask('dev', ['jshint', 'concat', 'metricsgen', 'less:dev', 'autoprefixer', 'processhtml:dev', 'configureProxies:server', 'connect:dev', 'watch']);

	grunt.registerTask('dist', ['jshint', 'concat', 'metricsgen', 'uglify', 'less:dist', 'autoprefixer', 'copy', 'processhtml:dist', 'htmlmin']);

	grunt.registerTask('default', ['dev']);
};