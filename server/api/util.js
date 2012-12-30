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

exports.buildJSONPResponse = function(req, obj)
{
	var str = JSON.stringify(obj);
	if ("callback" in req.query)
	{
		return req.query.callback + '(' + str + ')';
	}
	else
	{
		return str;
	}
}

exports.buildDateTimeStr = function(dateObj) {
    year   = dateObj.getYear();
    month  = dateObj.getMonth() + 1;
    day    = dateObj.getDate();
    hour   = dateObj.getHours();
    minute = dateObj.getMinutes();
    second = dateObj.getSeconds();
    if (year < 2000) { year  += 1900; }
    if (month  < 10) { month  = '0'+month; }
    if (day    < 10) { day    = '0'+day; }
    if (hour   < 10) { hour   = '0'+hour; }
    if (minute < 10) { minute = '0'+minute; }
    if (second < 10) { second = '0'+second; }
    return String(year)+'/'+month+'/'+day+' '+hour+':'+minute+':'+second;
};
