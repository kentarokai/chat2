/*
 * Chat2
 * Copyright 2013, Kentaro Kai
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
*/
var connect = require('connect');
var http = require('http');
var path = require('path');
var api = require('./api');
var middleware_mysql = require('./middleware/mysql');

exports.app = function(config)
{
	var app = connect()
		.use(function(req, res, next)
			 {
				// config
				config.basedir = __dirname;
				req.config = config;
				// default header
				res.setHeader('Content-Type', "application/json; charset=UTF-8");
				next();
			})
		.use(middleware_mysql(config))
		.use(connect.query())
		.use(connect.bodyParser());

    app = api.map_url(app, config);

	app.use(config.server.base + '/', function(req, res)
		 {
			 res.setHeader('Content-Type', "text/html; charset=UTF-8");
			 res.end('chat2');
		});

	return app;
}

if (!module.parent)
{
	process.on('uncaughtException', function(err)
	{
		console.log("===========================================");
		console.log("!!!!!!!! CATCHED uncaughtException !!!!!!!!");
		console.log(err);
		console.log("===========================================");
	});

	var config = null;
	config = require('./config');
	var app = exports.app(config);
	http.createServer(app).listen(config.server.port);
}

