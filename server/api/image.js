var myutil = require('./util');
var user = require('./user');
var fs = require("fs");
var exec = require('child_process').exec;

exports.upload = function(req,res){

	user.heartbeatToDB(req, res, function(){

		console.log("upload by " + req.userName);
		
		if (req.files && req.files.file && req.files.file.name && req.files.file.path){
			var path = req.files.file.path;
			var name = req.files.file.name;
	
			console.log(name);

			exec('rm -rf ' + req.config.image.uploadDir + '/20*', function(err, stdout, stderr){
				
				var newFileName = myutil.dateToFormattedString(new Date(), "YmdHisu");
				var names = name.split(".");
				if (0 < names.length){
					var ext = names.pop();
					if (ext){
						newFileName += "." + ext;
					}
				}
				
				var newPath = req.config.image.uploadDir + "/" + newFileName;
				console.log(newPath);
				res.setHeader('Content-Type', "text/plain; charset=UTF-8");
				fs.rename(path, newPath, function(err){
					if (err){
						res.end(myutil.buildJSONPResponse(req, {'stat': 'ng', 'error':'upload error'}));
						return;
					}
					var urlPath = req.config.image.uploadURLDir + "/" + newFileName;
					res.end(myutil.buildJSONPResponse(req, {'stat': 'ok', path: urlPath}));
				});
			});
		}else{
			res.setHeader('Content-Type', "text/plain; charset=UTF-8");
			res.end(myutil.buildJSONPResponse(req, {'stat': 'ok', path: ''}));
		}
	});
}

exports.convert = function(req,res){

	user.heartbeatToDB(req, res, function(){
		console.log("download with uploaded base64 data by " + req.userName);

		var data = req.body.data;
		data = data.substr(22);
//		console.log(data);
//		data:image/png;base64,

		var fileName = "chat-" + req.userName + "-" + myutil.dateToFormattedString(new Date(), "YmdHis") + ".png";
		
		res.setHeader('Content-Description', "File Transfer");
		res.setHeader('Content-Type', "image/png");
		res.setHeader('Content-Disposition', "attachment; filename=" + fileName);
		res.setHeader('Content-Transfer-Encoding', "binary");
		
		res.end(new Buffer(data, 'base64'));
	});
}

