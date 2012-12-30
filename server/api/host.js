var myutil = require('./util')
var exec = require("child_process").exec;

var buildJSONPResponse = function(req, obj)
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

var buildDateTimeStr = function(dateObj) {
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

var HOST_STATUS_DISABLED = 0;
var HOST_STATUS_UNKNOWN  = 1;
var HOST_STATUS_FINE	 = 100;
var HOST_STATUS_FLAP_E1	 = 201;
var HOST_STATUS_FLAP_E2	 = 202;
var HOST_STATUS_FLAP_EMAX = HOST_STATUS_FLAP_E2;
var HOST_STATUS_FLAP_F1	 = 301;
var HOST_STATUS_FLAP_F2	 = 302;
var HOST_STATUS_FLAP_FMAX = HOST_STATUS_FLAP_F2;
var HOST_STATUS_ERROR	 = 400;

exports.list = function(req, res)
{
//	console.log(req.url);

	req.mysql.query(
		"SELECT * FROM host ORDER BY pri DESC, id DESC",
		function(err, results, fields)
		{
			if (err)
			{
				res.end(buildJSONPResponse(req, {'stat': 'ng', 'error':'Query Error'}));
				return;
			}

			res.end(buildJSONPResponse(req, {'stat': 'ok', hosts:results}));
		}
	);	
}

exports.update = function(req, res)
{
//	console.dir(req.query);
	
	var vals = {};

	vals.name = req.query.name.trim();
	if (!vals.name)
	{
		res.end(buildJSONPResponse(req, {'stat': 'ng', 'error':'no name'}));
		return;
	}

	vals.url = req.query.url.trim();
	if (!vals.url)
	{
		res.end(buildJSONPResponse(req, {'stat': 'ng', 'error':'no url'}));
		return;
	}
	if (0 != vals.url.indexOf("http://"))
	{
		res.end(buildJSONPResponse(req, {'stat': 'ng', 'error':'url needs http:// (https:// is not available)'}));
		return;
	}
	if (10 > vals.url.length)
	{
		res.end(buildJSONPResponse(req, {'stat': 'ng', 'error':'url too short'}));
		return;
	}
	if (3 == vals.url.split("/").length)
	{
		vals.url += "/";
	}
	
	vals.mail = req.query.mail.trim();
	if (vals.mail && 0 > vals.mail.indexOf("@"))
	{
		res.end(buildJSONPResponse(req, {'stat': 'ng', 'error':'invalid mail format'}));
		return;
	}

	vals.condition_string = req.query.condition_string.trim();

	vals.condition_minbyte = parseInt(req.query.condition_minbyte.trim(), 10);
	if(isNaN(vals.condition_minbyte))
	{
		vals.condition_minbyte = 0;
	}
	
	vals.status = parseInt(req.query.status.trim(), 10);
	if(isNaN(vals.status))
	{
		vals.status = HOST_STATUS_DISABLED;
	}

	vals.id = parseInt(req.query.id.trim(), 10);
	if(isNaN(vals.id))
	{
		res.end(buildJSONPResponse(req, {'stat': 'ng', 'error':'invalid id format'}));
		return;
	}

	console.log("[" + buildDateTimeStr(new Date()) + "] -- update host (ID: " + vals.id + ")");
	
	if (HOST_STATUS_DISABLED != vals.status)
	{
		var now = new Date();
		now.setTime(now.getTime() + (30 * 1000));
		vals.next = buildDateTimeStr(now);
	}
	else
	{
		vals.next = buildDateTimeStr(new Date("2100/01/01 00:00:00"));
	}

	vals.checking = 0;
	vals.result='';
	//	console.dir(vals);


	req.mysql.query(
		"UPDATE host SET name=?, url=?, mail=?, condition_string=?, condition_minbyte=?, status=?, next=?, checking=?, result=? WHERE id=?",
		[vals.name, vals.url, vals.mail, vals.condition_string, vals.condition_minbyte, vals.status, vals.next, vals.checking, vals.result='', vals.id],
		function(err, fields)
		{
			if (err)
			{
				res.end(buildJSONPResponse(req, {'stat': 'ng', 'error':'Query Error'}));
				return;
			}
//			console.dir(fields);
			res.end(buildJSONPResponse(req, {'stat': 'ok', host: vals}));
		}
	);	
}

var _activate = function(req, res, isActivate)
{
	var vals = {
		status : (isActivate ? HOST_STATUS_UNKNOWN : HOST_STATUS_DISABLED)
	};
	vals.id = parseInt(req.query.id.trim(), 10);
	if(isNaN(vals.id))
	{
		res.end(buildJSONPResponse(req, {'stat': 'ng', 'error':'invalid id format'}));
		return;
	}

	if (isActivate)
	{
		var now = new Date();
		now.setTime(now.getTime() + (30 * 1000));
		vals.next = buildDateTimeStr(now);

		console.log("[" + buildDateTimeStr(new Date()) + "] -- activate host (ID: " + vals.id + ")");
	}
	else
	{
		vals.next = buildDateTimeStr(new Date("2100/01/01 00:00:00"));

		console.log("[" + buildDateTimeStr(new Date()) + "] -- inactivate host (ID: " + vals.id + ")");
	}

	
	vals.checking = 0;
	vals.result = '';
	
//	console.dir(vals);
	
	req.mysql.query(
		"UPDATE host SET status=?, next=?, checking=?, result=? WHERE id=?",
		[vals.status, vals.next, vals.checking, vals.result, vals.id],
		function(err, fields)
		{
			if (err)
			{
				res.end(buildJSONPResponse(req, {'stat': 'ng', 'error':'Query Error'}));
				return;
			}
//			console.dir(fields);
			res.end(buildJSONPResponse(req, {'stat': 'ok', host: vals}));
		}
	);	

//	console.dir(req.query);
	
}

exports.activate = function(req, res)
{
	_activate(req, res, true);
}

exports.inactivate = function(req, res)
{
	_activate(req, res, false);
}

exports.add = function(req, res)
{
//	console.dir(req.query);

	var vals = {};

	vals.name = req.query.name.trim();
	if (!vals.name)
	{
		res.end(buildJSONPResponse(req, {'stat': 'ng', 'error':'no name'}));
		return;
	}

	vals.url = req.query.url.trim();
	if (!vals.url)
	{
		res.end(buildJSONPResponse(req, {'stat': 'ng', 'error':'no url'}));
		return;
	}
	if (0 != vals.url.indexOf("http://"))
	{
		res.end(buildJSONPResponse(req, {'stat': 'ng', 'error':'url needs http:// (https:// is not available)'}));
		return;
		return;
	}
	if (10 > vals.url.length)
	{
		res.end(buildJSONPResponse(req, {'stat': 'ng', 'error':'url too short'}));
		return;
	}
	if (3 == vals.url.split("/").length)
	{
		vals.url += "/";
	}
	
	vals.mail = req.query.mail.trim();
	if (vals.mail && 0 > vals.mail.indexOf("@"))
	{
		res.end(buildJSONPResponse(req, {'stat': 'ng', 'error':'invalid mail format'}));
		return;
	}

	vals.condition_string = req.query.condition_string.trim();

	vals.condition_minbyte = parseInt(req.query.condition_minbyte.trim(), 10);
	if(isNaN(vals.condition_minbyte))
	{
		vals.condition_minbyte = 0;
	}
	
	vals.status = parseInt(req.query.status.trim(), 10);
	if(isNaN(vals.status))
	{
		vals.status = HOST_STATUS_DISABLED;
	}
	
//	console.dir(vals);
	console.log("[" + buildDateTimeStr(new Date()) + "] -- add host");
	
	vals.next = buildDateTimeStr(new Date("2100/01/01 00:00:00"));

	vals.checking = 0;
	vals.result='';
	vals.pri = 99999;

	req.mysql.query(
		"INSERT INTO host SET name=?, url=?, mail=?, condition_string=?, condition_minbyte=?, status=?, next=?, checking=?, result=?, pri=?",
		[vals.name, vals.url, vals.mail, vals.condition_string, vals.condition_minbyte, vals.status, vals.next, vals.checking, vals.result, vals.pri],
		function(err, fields)
		{
			if (err)
			{
				res.end(buildJSONPResponse(req, {'stat': 'ng', 'error':'Query Error'}));
				return;
			}
//			console.dir(fields);

			req.mysql.query(
				"SELECT * FROM host where id=?", [fields.insertId],
				function(err, results, fields)
				{
					if (err)
					{
						res.end(buildJSONPResponse(req, {'stat': 'ng', 'error':'Query Error'}));
						return;
					}

//					console.dir(results);
					res.end(buildJSONPResponse(req, {'stat': 'ok', hosts:results}));
				}
			);	
		}
	);
}

exports.delete = function(req, res)
{
	var vals = {};
	vals.id = parseInt(req.query.id.trim(), 10);
	if(isNaN(vals.id))
	{
		res.end(buildJSONPResponse(req, {'stat': 'ng', 'error':'invalid id format'}));
		return;
	}

	console.log("[" + buildDateTimeStr(new Date()) + "] -- delete host (ID: " + vals.id + ")");
	
	req.mysql.query(
		"DELETE FROM host WHERE id=?",
		[vals.id],
		function(err, fields)
		{
			if (err)
			{
				res.end(buildJSONPResponse(req, {'stat': 'ng', 'error':'Query Error'}));
				return;
			}
//			console.dir(fields);
			res.end(buildJSONPResponse(req, {'stat': 'ok', host: vals}));
		}
	);	

//	console.dir(req.query);
}

var _check = function(req, callback)
{
	req.mysql.query(
		"SELECT * FROM host WHERE status<>? AND next < NOW() AND checking=? ORDER BY next DESC LIMIT 1",
		[HOST_STATUS_DISABLED, 0],
		function(err, results, fields)
		{
			if (err)
			{
				callback(err);
				return;
			}

//			console.dir(results);
			if (!results.length)
			{
				//今回処理するものはない
				callback(null);
				return;
			}

			var item = results[0];
			req.mysql.query(
				"UPDATE host SET checking=? WHERE id=?",
				[1, item.id],
				function(err, fields)
				{
					if (err)
					{
						callback(err);
						return;
					}
					console.log("[" + buildDateTimeStr(new Date()) + "] -- check host (" + item.id + " / " + item.name + ")");

					var _urlParts = item.url.split("/");
					var domainOrIP = _urlParts[2];

					var protocol = _urlParts[0] + "//"; // http://
					protocol += domainOrIP; // http://www.xxx.com
					var urlPath = item.url.substring(protocol.length);

					//TODO どうみても危険。好きなコマンド叩かれるよ？
					var opt = " -t 30 -H " + domainOrIP + " -A \"XBS-KANSHI/1.0\" -u \"" + urlPath + "\"";

					if (item.condition_string)
					{
						var _s = item.condition_string;
						_s = _s.replace(/\"/g, "\\\"");
						opt += " -s \"" + _s + "\"";
					}
					if (item.condition_minbyte)
					{
						opt += " -m " + item.condition_minbyte;
					}
					
					var binPath = __dirname + "/../bin/check_http";

					console.log("check_http" + opt);

					exec(binPath + opt,
						function (err, stdout, stderr)
						{
							var nextStatus = HOST_STATUS_UNKNOWN;
							var needNotification = false;
							var needNextCheck = false;
							
							if (0 <= stdout.indexOf("WARNING")
								|| 0 <= stdout.indexOf("CRITICAL"))
							{
								if (HOST_STATUS_UNKNOWN == item.status
									|| HOST_STATUS_FINE == item.status)
								{
									nextStatus = HOST_STATUS_FLAP_E1;
									needNextCheck = true;
								}
								else if (HOST_STATUS_FLAP_E1 == item.status)
								{
									nextStatus = HOST_STATUS_FLAP_E2;
									needNextCheck = true;
								}
								else if (HOST_STATUS_FLAP_E2 == item.status)
								{
									nextStatus = HOST_STATUS_ERROR;
									needNotification = true;
								}
								else if (HOST_STATUS_ERROR == item.status)
								{
									nextStatus = HOST_STATUS_ERROR;
								}
								else if (HOST_STATUS_FLAP_F1 == item.status
										 || HOST_STATUS_FLAP_F2 == item.status)
								{
									nextStatus = HOST_STATUS_ERROR;
									needNextCheck = true;
								}
							}
							else
							{
								if (HOST_STATUS_UNKNOWN == item.status
									|| HOST_STATUS_FINE == item.status)
								{
									nextStatus = HOST_STATUS_FINE;
								}
								else if (HOST_STATUS_FLAP_E1 == item.status
										 || HOST_STATUS_FLAP_E2 == item.status)
								{
									nextStatus = HOST_STATUS_FINE;
									needNextCheck = true;
								}
								else if (HOST_STATUS_ERROR == item.status)
								{
									nextStatus = HOST_STATUS_FLAP_F1;
									needNextCheck = true;
								}
								else if (HOST_STATUS_FLAP_F1 == item.status)
								{
									nextStatus = HOST_STATUS_FLAP_F2;
									needNextCheck = true;
								}
								else if (HOST_STATUS_FLAP_F2 == item.status)
								{
									nextStatus = HOST_STATUS_FINE;
									needNotification = true;
								}
							}
							
//							console.log(stdout);
							console.log("next-status:" + nextStatus + " next-check:" + (needNextCheck?'YES':'NO')+ " notification:" + (needNotification?'YES':'NO'));

							req.mysql.query(
								"SELECT * FROM host WHERE id=?",
								[item.id],
								function(err, results, fields)
								{
									if (!results.length)
									{
										//チェック中に削除された
										callback(null);
										return;
									}
									
									item = results[0];
									if (!item.checking)
									{
										//チェック中に設定が変更された
										callback(null);
										return;
									}

									var vals = {
										id: item.id,
										status: nextStatus,
										checking: 0,
										result: stdout,
									};

									var now = new Date();
									if (needNextCheck)
									{
										now.setTime(now.getTime() + (60 * 1000));
									}
									else
									{
										now.setTime(now.getTime() + ((5 * 60 + Math.floor( Math.random() * 20 )) * 1000));
									}
									vals.next = buildDateTimeStr(now);

									if (needNextCheck || needNotification)
									{
										console.dir(vals);
									}
									
									req.mysql.query(
										"UPDATE host SET status=?, checking=?, next=?, result=? WHERE id=?",
										[vals.status, vals.checking, vals.next, vals.result, vals.id],
										function(err, fields)
										{
											if (item.mail && needNotification)
											{
												console.log("mail to " + item.mail);

												var transport = nodemailer.createTransport("sendmail", {
    												path: "/usr/sbin/sendmail",
												});

												var t1 = (vals.status == HOST_STATUS_FINE) ? 'FINE' : 'ERROR';
												var t2 = domainOrIP;
												var t3 = buildDateTimeStr(new Date());
												var t = "[" + t1 + "] " + t2 + " (" + t3 + ")";

												var f = "XBS Kanshi-kun <no-reply@tools.xbs.co.jp>";

												var s = "'" + item.name + "' is " + t1 + ".";
												s += "\n\n";
												s += "date: " + t3 + "\n";
												s += "url : " + item.url + "\n\n";
												s += "check_http result :\n------------\n" + vals.result + "------------\n\n";
												s += "http://tools.xbs.co.jp/kanshi/\n";
										
												var h = "<b>'" + item.name + "' is <font color='" + (vals.status == HOST_STATUS_FINE ? "#088920" : "#FF0000") + "'>" + t1 + "</font>.</b>";
												h += "<br /><br />";
												h += "<table>";
												h += "<tr><td>date:</td><td>" + t3 + "</td></tr>";
												h += "<tr><td>url:</td><td>" + item.url + "</td></tr>";
												h += "</table><br />";
												h += "<b>check_http result:</b><br />";
												h += vals.result + "<br /><br />";
												h += "<a href='http://tools.xbs.co.jp/kanshi/'>http://tools.xbs.co.jp/kanshi</a>\n";

												var mailOptions = {
    												from:	f,
											    	to: 	item.mail,
											    	subject:t,
											    	text:	s,
											    	html:	h,
												};

												transport.sendMail(mailOptions, function(error, response)
												{
    												if(error)
													{
    	    											console.log(error);
											    	}
													else
													{
											        	console.log("Message sent: " + response.message);
											    	}
													transport.close();

													callback(null);
												});
											}
											else
											{											
												callback(null);
											}
										}
									);
								}
							);
						}
					);
				}
			);	
		}
	);
}

exports.check = function(req, res)
{
	
	_check(req, function(err)
	{
		res.end(buildJSONPResponse(req, {'stat': 'ok'}));
	});
}


var _sortCore = function(req, ids, index, callback)
{
	if (index >= ids.length)
	{
//		console.log("finished");
		callback(null);
		return;
	}

//	console.log("A: " + index + " " + ids[index]);
	req.mysql.query(
		"UPDATE host SET pri=? WHERE id=?",
		[index, ids[index]],
		function(err, fields)
		{
			if (err)
			{
//				console.log("B");
				callback(err);
				return;
			}
//			console.log("C");

			index++;
			
			//再帰
			_sortCore(req, ids, index, callback);
		}
	);	
}


exports.sort = function(req, res)
{
	var ids = [];
	var i=0;
	for(var j in req.query.ids)
	{
		ids[i++] = parseInt(req.query.ids[j], 10);
	}

	console.log("[" + buildDateTimeStr(new Date()) + "] -- sort");
	console.dir(ids);
	
	_sortCore(req, ids, 0, function(err)
	{
		res.end(buildJSONPResponse(req, {'stat': 'ok'}));
	});
}

