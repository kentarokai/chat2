/*
 * Chat2
 * Copyright 2013, Kentaro Kai
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
*/
var myutil = require('./util');
var user = require('./user');

var DEFINE_OLD_SEC = 180;
var Event = null;

exports.registModels = function(mongoose){
	var Schema = mongoose.Schema;
	var EventSchema = new Schema({
		ctime: Date,
		ctimeStr: String,
		action: String,
		instanceId: Number,
		user:{
			type: Schema.Types.ObjectId,
			ref: 'User'
		},
		val: Object
	});
	Event = mongoose.model('Event', EventSchema);
	return mongoose;
}


var deleteAllEvents = exports.deleteAllEvents = function(req, res, next, passThrough){

	if (passThrough){
		next && next();
		return;
	}

	myutil.log("Delete ALL events");

	Event.remove({}, function (err, result){
		if (err) {
			res.end(myutil.buildJSONPResponse(req, {'stat': 'ng', 'error':'Query Error'}));
			return;
		}
		next && next();
	});
}

var deleteAllLineEvents = exports.deleteAllLineEvents = function(req, res, next, passThrough){

	if (passThrough){
		next && next();
		return;
	}
	myutil.log("Delete all line events");

	Event.remove({action: /^line/ }, function (err, result){
		if (err) {
			res.end(myutil.buildJSONPResponse(req, {'stat': 'ng', 'error':'Query Error'}));
			return;
		}
		next && next();
	});
}

var deleteAllImageEvents = exports.deleteAllImageEvents = function(req, res, next, passThrough){

	if (passThrough){
		next && next();
		return;
	}
	myutil.log("Delete all image events");

	Event.remove({action: /^image/ }, function (err, result){
		if (err) {
			res.end(myutil.buildJSONPResponse(req, {'stat': 'ng', 'error':'Query Error'}));
			return;
		}
		next && next();
	});
}

exports.fetch = function(req, res){
	var fromTime = new Date();
	fromTime.setTime(0);
	if ('from' in req.query){
		var from = parseInt(req.query.from , 10);
		if (!isNaN(from)){
			fromTime.setTime(from);
		}
	}

	var exceptInstanceId = 0;
	if ('exceptInstanceId' in req.query){
		exceptInstanceId = parseInt(req.query.exceptInstanceId, 10);
		if (isNaN(exceptInstanceId)){
			exceptInstanceId = 0;
		}
	}

	user.heartbeatToDB(req, res, function(){
		
		Event
		.find()
		.gt('ctime', fromTime)
		.ne('instanceId', exceptInstanceId)
		.populate('user', 'name')
		.exec(function (err, events) {
			if (err) {
				res.end(myutil.buildJSONPResponse(req, {'stat': 'ng', 'error':'Query Error'}));
				return;
			}

			user.getActiveUsers(req, res, function(users){
				res.end(myutil.buildJSONPResponse(req, {
					'stat': 'ok',
					user: {id: req.userId, name: req.userName},
					users: users,
					events:events
				}));
			});
		});
	});	
}

var _sendCore  = function(req, res, events, instanceId){
	var now = new Date();

	var _events = [];
	for(var i=0;i<events.length;i++){
		var event = events[i];
		var _e = {};
		_e.ctime = now;
		_e.ctimeStr = "" + now.getTime();
		_e.action = event.action;
		_e.instanceId = instanceId;
		_e.user = req.userId;
		if(event.val){
			var val = event.val;
			if (val.lineWidth && "string" == typeof(val.lineWidth)){
				val.lineWidth = parseFloat(val.lineWidth);
			}
			if (val.points && val.points.length){
				for(var j=0;j<val.points.length;j++){
					var point = val.points[j];
					if (point.x && "string" == typeof(point.x)){
						point.x = parseFloat(point.x);
					}
					if (point.y && "string" == typeof(point.y)){
						point.y = parseFloat(point.y);
					}
				}
			}
			if (val.smoothed  && "string" == typeof(val.smoothed)){
				val.smoothed = 'true' == val.smoothed;
			}
			_e.val = val;
		}else{
			_e.val = null;
		}
		
		_events.push(_e);

		myutil.log(typeof event.val);
		console.log(event.val);
	}
	
	Event.create(_events, function (err) {
		if (err){
			res.end(myutil.buildJSONPResponse(req, {'stat': 'ng', 'error':'Saving Error'}));
			return;
		}
		user.getActiveUsers(req, res, function(users){
			res.end(myutil.buildJSONPResponse(req, {
				'stat': 'ok',
				user: {
					id: req.userId,
					name: req.userName
				},
				users: users
			}));
		});
	});
};

exports.send = function(req, res){
	
	user.heartbeatToDB(req, res, function(){
		if (!('events' in req.body)
			|| !req.body.events.length){
			res.end(myutil.buildJSONPResponse(req, {'stat': 'ok', user: {id: req.userId, name: req.userName}}));
			return;
		}

		var instanceId = 0;
		if ('instanceId' in req.body){
			instanceId = parseInt(req.body.instanceId, 10);
			if (isNaN(instanceId)){
				instanceId = 0;
			}
		}

		var clearLineIndex = -1;
		var imageEventIndex = -1;
		var events = req.body.events;
		for(var i=0;i<req.body.events.length;i++){
			var event = req.body.events[i];
			if ("lineclear" == event.action && clearLineIndex < 0){
				clearLineIndex = i;
			}else if (event.action.match(/^image/i)){
				imageEventIndex = i;
			}
		}
		var clearLines = false;
		if (0 <= clearLineIndex){
			events = [];
			events.push(req.body.events[clearLineIndex]);
			clearLines = true;
		}

		var clearImage = (0 <= imageEventIndex);

		deleteAllImageEvents(req, res, function(){
			deleteAllLineEvents(req, res, function(){
				_sendCore(req, res, events, instanceId);
			}, !clearLines);
		}, !clearImage);
	});
	
}
