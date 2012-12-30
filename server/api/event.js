var myutil = require('./util');
var user = require('./user');

var DEFINE_OLD_SEC = 180;

var deleteOldEvents = function(req, res, howOld, next){
	var now = new Date();
	now.setTime(now.getTime() - 1000 * howOld);
	var dateStr = myutil.buildDateTimeStr(now);
	req.mysql.query("DELETE FROM event WHERE ctime < ?",
		[dateStr],
		function(err, result) {
			if (err) {
				res.end(myutil.buildJSONPResponse(req, {'stat': 'ng', 'error':'Query Error'}));
				return;
			}
			if (next){
				next();
			}
			return;
		});
}

var deleteAllEvents = exports.deleteAllEvents = function(req, res, next, passThrough){

	if (next && passThrough){
		next();
		return;
	}
	
	req.mysql.query("DELETE FROM event",
		function(err, result) {
			if (err) {
				res.end(myutil.buildJSONPResponse(req, {'stat': 'ng', 'error':'Query Error'}));
				return;
			}
			if (next){
				next();
			}
			return;
		});
}

var deleteAllLineEvents = exports.deleteAllLineEvents = function(req, res, next, passThrough){

	if (next && passThrough){
		next();
		return;
	}
	console.log("Delete all line events");
	
	req.mysql.query("DELETE FROM event WHERE action LIKE 'line%'",
		function(err, result) {
			if (err) {
				res.end(myutil.buildJSONPResponse(req, {'stat': 'ng', 'error':'Query Error'}));
				return;
			}
			if (next){
				next();
			}
			return;
		});
}

exports.fetch = function(req, res){
	user.heartbeatToDB(req, res, function(){
		user.getActiveUsers(req, res, function(users){
			var from = 0;
			if ('from' in req.query){
				from = parseInt(req.query.from , 10);
				if (isNaN(from)){
					from = 0;
				}
			}
			var exceptInstanceId = -1;
			if ('exceptInstanceId' in req.query){
				exceptInstanceId = parseInt(req.query.exceptInstanceId, 10);
				if (isNaN(exceptInstanceId)){
					exceptInstanceId = 0;
				}
			}
			var query = "select event.*, user.name as userName from event INNER JOIN user ON event.userId=user.id";
			var values = [];
			query += " WHERE event.id>?";
			values.push(from);
			if (0 < exceptInstanceId){
				query += " AND event.instanceId<>?";
				values.push(exceptInstanceId);
			}
			query += " ORDER BY event.id";
			req.mysql.query(
				query,
				values,
				function(err, results, fields) {
					if (err) {
						res.end(myutil.buildJSONPResponse(req, {'stat': 'ng', 'error':'Query Error'}));
						return;
					}
					res.end(myutil.buildJSONPResponse(req, {'stat': 'ok', user: {id: req.userId, name: req.userName}, users: users, events:results}));
				}
			);
		});
	});
}

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
		var events = req.body.events;
		for(var i=0;i<req.body.events.length;i++){
			var event = req.body.events[i];
			if ("lineclear" == event.action){
				clearLineIndex = i;
				break;
			}
		}
		var clearLines = false;
		if (0 <= clearLineIndex){
			events = [];
			events.push(req.body.events[clearLineIndex]);
			clearLines = true;
		}

		deleteAllLineEvents(req, res, function(){
			var now = new Date();
			var nowStr = myutil.buildDateTimeStr(now);
	
			var query = "INSERT INTO event (ctime, action, value, userId, instanceId) VALUES";
			var values = [];
			for(var i=0;i<events.length;i++){
				var event = events[i];
				if (0!=i){
					query += ",";
				}
				query += "(?, ?, ?, " + req.userId + ", " + instanceId + ")";
				values.push(nowStr);
				values.push(event.action);
				values.push(event.value);
			}
			req.mysql.query(query,
				values,
				function(err, result) {
					if (err) {
						res.end(myutil.buildJSONPResponse(req, {'stat': 'ng', 'error':'Query Error'}));
						return;
					}
					user.getActiveUsers(req, res, function(users){
						res.end(myutil.buildJSONPResponse(req, {'stat': 'ok', user: {id: req.userId, name: req.userName}, users: users}));
					return;
					});
				});
		}, !clearLines);
		
	});
	
}
