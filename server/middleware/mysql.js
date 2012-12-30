exports = module.exports = function(config)
{
	return function(req, res, next)
	{
		var mysql      = require('mysql');
		var client = mysql.createConnection({
			host     : config.mysql.host,
			user     : config.mysql.user,
			password : config.mysql.password,
			database : config.mysql.database,
			insecureAuth: true
		});

		client.connect();
//		console.log("open mysql connection");

		var end = res.end;
		req.mysql = client;
		res.end = function(chunk, encoding)
		{
			res.end = end;
			res.end(chunk, encoding);
			if (client)
			{
				client.end();
//				console.log("closed mysql connection");
			}
		};
		next();
	}
}

