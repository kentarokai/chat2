/*
 * Chat2
 * Copyright 2013, Kentaro Kai
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
*/
var connect = require('connect');
var MemoryStore = connect.session.MemoryStore;
var http = require('http');
var path = require('path');
var api = require('./api');
var middleware_mongoose = require('./middleware/mongoose');
var sessionStore = new MemoryStore();
var Cookie = require('cookie');
var config = require('./config');
var parseSignedCookies = require('connect').utils.parseSignedCookies;

exports.app = function(config)
{
	var mongoose = middleware_mongoose.init(config);
	mongoose = api.registModels(mongoose);

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
		.use(middleware_mongoose.middleware())
		.use(connect.query())
		.use(connect.basicAuth(function(uname, pass){
			console.log("AUTH:" + uname + ":" + pass);
			return true;
		}))
		.use(connect.bodyParser())
		.use(connect.cookieParser())
		.use(connect.session({
			secret: config.session.secret,
			key: config.session.key,
			cookie: {
				httpOnly: false
			},
			store: sessionStore
		}));

    app = api.map_url(app, config);
	
	app.use(config.server.base + '/', function(req, res){
		res.setHeader('Content-Type', "text/html; charset=UTF-8");
		res.end('chat2');
	});

	return app;
}

var setupSocketIO = function( config){

	var io = require('socket.io').listen(config.socketio.port)
	
	io.configure(function () {
		io.set('transports', ['websocket']);
		io.set('authorization', function (handshakeData, callback) {
			if (handshakeData.headers.cookie){
				console.log(Cookie);
				var cookies = Cookie.parse(handshakeData.headers.cookie);
				var sessionId = parseSignedCookies(cookies, config.session.secret)[config.session.key];
				console.log(sessionId);
				console.log(sessionStore.sessions);
				sessionStore.get(sessionId, function (err, session) {
					if (err || !session){
	
					}else{
						handshakeData.session =  session;
						console.log(session);
					}
					callback(null, true);
				});			
			}else{
				callback(null, true);
			}
		});
	});
	
	io.sockets.on('connection', function (socket) {
	
		console.log('session data##', socket.handshake.session);
		
		socket.on('all', function(data){
			io.sockets.json.emit('msg', data);
		});
	
		socket.on('others', function(data){
			if (socket.handshake.session && socket.handshake.session.userName){
				data.from = socket.handshake.session.userName;
				socket.json.broadcast.emit('msg', data);
			}
		});
	
		var initialMsg = 'Hello, ';
		if (socket.handshake.session && socket.handshake.session.userName){
			initialMsg += socket.handshake.session.userName;
		}
		
		socket.json.emit('msg', {
			from: 'ChatServer',
			instanceId: 0,
			data: initialMsg,
			type: 'Message'
		});
	});

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
	var server = http.createServer(app);
	server.listen(config.server.port);
	
	setupSocketIO(config)
}


