var mongoose = require('mongoose');

exports.init = function(config){
	mongoose.connect(config.mongoose.host, config.mongoose.database);
	return mongoose;
}

exports.middleware = function(){

	return function(req, res, next){
		req.mongoose = mongoose;
		next();
	}
}

