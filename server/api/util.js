/*
 * Chat2
 * Copyright 2013, Kentaro Kai
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
*/
var customLog = exports.log = function(o){
	console.log("[" + dateToFormattedString(new Date(), "Y/m/d H:i:s.u") + "] " , o);
}

var tkurl_parser = exports.url_parser = function(req, res, callback) {
  var params = {};
  if (req.url && req.url.match(/^\/([^\/]+)\/([^\/]+)\/([^\/]+)\/([^\/]+)\/?$/))
 {
    params.id = RegExp.$1;
    params.action_name =  RegExp.$2;
    params.target_name =  RegExp.$3;
    params.target_id =  RegExp.$4;
  } else if (req.url && req.url.match(/^\/([^\/]+)\/([^\/]+)\/([^\/]+)\/?$/)) {
    params.id = RegExp.$1;
    params.action_name =  RegExp.$2;
    params.target_name =  RegExp.$3;
  } else if (req.url && req.url.match(/^\/([^\/]+)\/?$/)) {
    params.id = RegExp.$1;
  }
  req.tkurl = { params: params};
  callback(req, res, params);
}

exports.getUserName = function(req){

	if ('authorization' in req.headers){
		var auth = (req.headers.authorization + "").split(" ")[1];
		var buf = new Buffer(auth, 'base64');
		var ascii = buf.toString('ascii');
		return ascii.split(":")[0];
	}
	return null;
}

var buildJSONPResponse = exports.buildJSONPResponse = function(req, obj)
{
	obj.acceptedAt = new Date();
	var str = JSON.stringify(obj);
	if ("callback" in req.query){
		return req.query.callback + '(' + str + ')';
	}else{
		return str;
	}
}

exports.buildJSONPErrorResponse = function(req, err){

	var errorMsg = (err.toString ? err.toString() : (err.message ? err.message : "Error"));
	customLog(errorMsg);

	return buildJSONPResponse(req, {
		'stat': 'ng',
		'error': customLog
		});
}

var dateToFormattedString = exports.dateToFormattedString = function(date, format){
	
	var str00 = function(num){
		var s = "";
		if(num < 10){
			s += "0";
		}
		return s + num;
	};

	var str000 = function(num){
		if (100 > num){
			return "0" + str00(num);
		}
		return "" + num;
	};

	var s = "";	
	for(var i=0;i<format.length;i++){
		var f = format[i];
		switch(f){
		default:
			s += f;
			break;
		case 'Y':
			s += str00(date.getFullYear());
			break;
		case 'm':
			s += str00(date.getMonth()+1);
			break;
		case 'd':
			s += str00(date.getDate());
			break;
		case 'H':
			s += str00(date.getHours());
			break;
		case 'i':
			s += str00(date.getMinutes());
			break;
		case 's':
			s += str00(date.getSeconds());
			break;
		case 'u':
			s += str000(date.getMilliseconds());
			break;
		}
	}
	return s;
};

exports.buildDateTimeStr = function(dateObj) {
	return dateToFormattedString(dateObj, "Y/m/d H:i:s");
};
