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

exports.list = function(req, res) {
//	myutil.log(req.url);
	
	req.mysql.query(
		"SELECT * FROM user",
		function(err, results, fields) {
			if (err) {
				res.end(myutil.buildJSONPResponse(req, {'stat': 'ng', 'error':'Query Error'}));
				return;
			}
			res.end(myutil.buildJSONPResponse(req, {'stat': 'ok', users:results}));
		}
	);	
}

var getActiveUsers = exports.getActiveUsers = function(req, res, next){
	var now = new Date();
	now.setTime(now.getTime() - 1000 * DEFINE_ACTIVE_SEC);
	var dateStr = myutil.buildDateTimeStr(now);
	
	req.mysql.query(
		"SELECT * FROM user WHERE lasttick > ?",
		[dateStr],
		function(err, results, fields) {
			if (err) {
				res.end(myutil.buildJSONPResponse(req, {'stat': 'ng', 'error':'Query Error'}));
				return;
			}
			if (next){
				next(results);
			}
		}
	);	
}

var heartbeatToDB = exports.heartbeatToDB = function(req, res, next){
	req.userName = myutil.getUserName(req);
	var now = new Date();
	var nowStr = myutil.buildDateTimeStr(now);

	req.mysql.query(
		"SELECT MAX(lasttick) as lasttick FROM user",
		function(err, results, fields) {
			if (err){
				res.end(myutil.buildJSONPResponse(req, {'stat': 'ng', 'error':'Query Error'}));
				return;
			}

			var needClearEvents = true;
			if (0 < results.length){
				var lasttick = results[0].lasttick;
				var diff = now.getTime() - lasttick.getTime();
				if (diff < (DEFINE_KEEP_EVENTS_SEC * 1000)){
					needClearEvents = false;
				}
			}
			
			event.deleteAllEvents(req, res, function(){
				req.mysql.query(
					"SELECT * FROM user WHERE name = ?",
					[req.userName],
					function(err, results, fields) {
						if (err){
							res.end(myutil.buildJSONPResponse(req, {'stat': 'ng', 'error':'Query Error'}));
							return;
						}
						if (results.length) {
							req.userId = results[0].id;
							req.mysql.query("UPDATE user SET lasttick=? WHERE id=?",
								[nowStr, req.userId],
								function(err, result) {
									if (err) {
										res.end(myutil.buildJSONPResponse(req, {'stat': 'ng', 'error':'Query Error'}));
										return;
									}
									if (next){
										next();
									}
									return
								});
							return;
						}else{
							req.mysql.query("INSERT INTO user SET lasttick=?, name=?",
								[nowStr, req.userName],
								function(err, result) {
									if (err) {
										res.end(myutil.buildJSONPResponse(req, {'stat': 'ng', 'error':'Query Error'}));
										return;
									}
									req.userId = result.insertId;
									if (next){
										next();
									}
									return
								});
						}
					}
					);
			}, !needClearEvents);
		});
};

exports.heartbeat = function(req, res)
{
	heartbeatToDB(req, res,
		function(){
			res.end(myutil.buildJSONPResponse(req, {'stat': 'ok', user: {id: req.userId, name: req.userName}}));
		});
}
