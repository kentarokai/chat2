var myutil = require('./util');
var user = require('./user');
var fs = require("fs");
var im = require('imagemagick');
var exec = require('child_process').exec;


var _uploadCore = function(req, res){
	exec('rm -rf ' + req.config.image.uploadDir + '/20*', function(err, stdout, stderr){
		
		var newFileName = myutil.dateToFormattedString(new Date(), "YmdHisu");
		if (req.uploadedImage.ext){
			newFileName += "." + req.uploadedImage.ext;
		}
		
		var newPath = req.config.image.uploadDir + "/" + newFileName;
		myutil.log(newPath);
		fs.rename(req.uploadedImage.path, newPath, function(err){
			if (err){
				res.end(myutil.buildJSONPResponse(req, {'stat': 'ng', 'error':'upload error'}));
				return;
			}
			var urlPath = req.config.image.uploadURLDir + "/" + newFileName;
			res.end(myutil.buildJSONPResponse(req, {'stat': 'ok', path: urlPath}));
		});
	});
}

var _uploadPDF = function(req, res){
	myutil.log("PDF!");

	var pngPath = req.uploadedImage.path + ".png";
	myutil.log("start converting");
	im.convert(['-density','150',req.uploadedImage.path+"[0]",pngPath], function(err,stdout){
		if (err){
			myutil.log("convert error: " + JSON.stringify(err));
			res.end(myutil.buildJSONPResponse(req, {'stat': 'ng', 'error':'convert error'}));
			return;
		}
		myutil.log("converted");
		fs.unlink(req.uploadedImage.path, function(err){
			if (err){
				res.end(myutil.buildJSONPResponse(req, {'stat': 'ng', 'error':'unlink error'}));
				return;
			}
			myutil.log("removed " + req.uploadedImage.path);
			req.uploadedImage.path = pngPath;
			req.uploadedImage.ext = "png";
			_uploadCore(req, res);
		});
	});
}

exports.upload = function(req,res){

	res.setHeader('Content-Type', "text/plain; charset=UTF-8");
	
	user.heartbeatToDB(req, res, function(){

		myutil.log("upload by " + req.userName);
		
		if (req.files && req.files.file && req.files.file.name && req.files.file.path){
			req.uploadedImage = {
				path: req.files.file.path,
				name: req.files.file.name,
				ext: ""
			};
			
			var names = req.files.file.name.split(".");
			if (0 < names.length){
				var ext = names.pop();
				if (ext){
					req.uploadedImage.ext = ext.toString().toLowerCase();
				}
			}

			myutil.log(req.uploadedImage);

			if ("pdf" == req.uploadedImage.ext){
				_uploadPDF(req, res);
			}else{
				_uploadCore(req, res);
			}
			
		}else{
			res.end(myutil.buildJSONPResponse(req, {'stat': 'ok', path: ''}));
		}
	});
}

exports.convert = function(req,res){

	user.heartbeatToDB(req, res, function(){
		myutil.log("download with uploaded base64 data by " + req.userName);

		var data = req.body.data;
		data = data.substr(22);
//		myutil.log(data);
//		data:image/png;base64,

		var fileName = "chat-" + req.userName + "-" + myutil.dateToFormattedString(new Date(), "YmdHis") + ".png";
		
		res.setHeader('Content-Description', "File Transfer");
		res.setHeader('Content-Type', "image/png");
		res.setHeader('Content-Disposition', "attachment; filename=" + fileName);
		res.setHeader('Content-Transfer-Encoding', "binary");
		
		res.end(new Buffer(data, 'base64'));
	});
}

