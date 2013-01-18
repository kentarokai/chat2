var mongoose = require('mongoose');

exports.init = function(config){
	mongoose.connect('localhost', 'chatserver');
	return mongoose;
}

exports.middleware = function(){

	return function(req, res, next){
		req.mongoose = mongoose;
		next();
	}
}

