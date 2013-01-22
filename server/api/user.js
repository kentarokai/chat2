/*
 * Chat2
 * Copyright 2013, Kentaro Kai
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
*/
var myutil = require('./util');
var event = require('./event');

var DEFINE_ACTIVE_SEC = 30;
var DEFINE_KEEP_EVENTS_SEC = 60;
var User = null;

exports.registModels = function(mongoose){
	var Schema = mongoose.Schema;
	var UserSchema = new Schema({
		lasttick: Date,
		name: String
	});
	User = mongoose.model('User', UserSchema);
	return mongoose;
}

exports.list = function(req, res) {

	User.find().exec(function(err, users){
		if (err){
			res.end(myutil.buildJSONPErrorResponse(req, err));
			return;
		}
		res.end(myutil.buildJSONPResponse(req, {'stat': 'ok', 'users':users}));
	});
}

var getActiveUsers = exports.getActiveUsers = function(req, res, next){
	var now = new Date();
	now.setTime(now.getTime() - 1000 * DEFINE_ACTIVE_SEC);

	User.find().gt('lasttick', now).exec(function(err, users){
		if (err){
			res.end(myutil.buildJSONPErrorResponse(req, err));
			return;
		}
		next && next(users);
	});
}

exports.heartbeat = function(req, res, next){
	req.userName = myutil.getUserName(req);
	req.session.userName = req.userName
	var now = new Date();

	User.findOne().select('lasttick').sort({lasttick:'desc'}).exec(function(err, user){
		if (err){
			res.end(myutil.buildJSONPErrorResponse(req, err));
			return;
		}

		var needClearEvents = true;
		if (user && user.lasttick){
			var diff = now.getTime() - user.lasttick.getTime();
			if (diff < (DEFINE_KEEP_EVENTS_SEC * 1000)){
				needClearEvents = false;
			}
		}
		
		event.deleteAllEvents(req, res, function(){
			User.findOne({ name: req.userName }, function(err, user){
				if (err){
					res.end(myutil.buildJSONPErrorResponse(req, err));
					return;
				}
				if (!user){
					user = new User();
					user.name = req.userName;
				}
				user.lasttick = now;
				user.save(function(err){
					if (err){
						res.end(myutil.buildJSONPErrorResponse(req, err));
						return;
					}
					req.userId = user._id;
					next && next();
				});	
			});
			
		}, !needClearEvents);
	});
	
	
};


