/*
 * Chat2
 * Copyright 2013, Kentaro Kai
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
*/
var myutil = require('./util');
var user = require('./user');
var fs = require("fs");
var im = require('imagemagick');
var exec = require('child_process').exec;

var IMAGE_MAX_SIZE = 1280;

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
				res.end(myutil.buildJSONPErrorResponse(req, err));
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
			res.end(myutil.buildJSONPErrorResponse(req, err));
			return;
		}
		myutil.log("converted");
		fs.unlink(req.uploadedImage.path, function(err){
			if (err){
				res.end(myutil.buildJSONPErrorResponse(req, err));
				return;
			}
			myutil.log("removed " + req.uploadedImage.path);
			req.uploadedImage.path = pngPath;
			req.uploadedImage.ext = "png";
			_uploadCore(req, res);
		});
	});
}

var _uploadJPG = function(req, res){
	myutil.log("JPG!");
	im.identify(['-format','%[EXIF:Orientation]\n%w\n%h',req.uploadedImage.path], function(err,stdout){
		if (err){
			myutil.log("identify error: " + JSON.stringify(err));
			_uploadCore(req, res);
			return;
		}
		if (!stdout){
			myutil.log("No STDOUT from ImageMagick");
			_uploadCore(req, res);
			return;
		}
		var outs = stdout.split("\n");
		if (!outs || 4 >outs.length){
			myutil.log("ImageMagick STDOUT Missing: " + stdout);
			_uploadCore(req, res);
			return;
		}
		var info  = {
			o:1,
			w:0,
			h:0
		}
		if (outs[0]){
			info.o = parseInt(outs[0], 10);
		}
		if (outs[1]){
			info.w = parseInt(outs[1], 10);
		}
		if (outs[2]){
			info.h = parseInt(outs[2], 10);
		}
		
		myutil.log(info);
	
		var longEdge = Math.max(info.w, info.h);
		if (1 == info.o
			&& longEdge < IMAGE_MAX_SIZE){
			myutil.log("No convert needed");
			_uploadCore(req, res);
			return;
		}

		var newPath = req.uploadedImage.path + "_new.jpg";
		
		var imopt = [];
		if (longEdge > IMAGE_MAX_SIZE){
			imopt.push("-geometry");
			var ratio = Math.round((IMAGE_MAX_SIZE / longEdge) * 100 * 1000) / 1000;
			imopt.push(ratio + "%");
		}
		if (3 == info.o){
			imopt.push("-rotate");
			imopt.push("+180");
		}
		if (6 == info.o){
			imopt.push("-rotate");
			imopt.push("+90");
		}
		if (8 == info.o){
			imopt.push("-rotate");
			imopt.push("-90");
		}
		imopt.push("-strip");
		imopt.push(req.uploadedImage.path);
		imopt.push(newPath);

		console.log(imopt);
		im.convert(imopt, function(err,stdout){
			if (err){
				myutil.log("convert error: " + JSON.stringify(err));
				res.end(myutil.buildJSONPErrorResponse(req, err));
				return;
			}
			myutil.log("converted");
			fs.unlink(req.uploadedImage.path, function(err){
				if (err){
					res.end(myutil.buildJSONPErrorResponse(req, err));
					return;
				}
				myutil.log("removed " + req.uploadedImage.path);
				req.uploadedImage.path = newPath;
				_uploadCore(req, res);
			});
		});
	});
};

exports.upload = function(req,res){

	res.setHeader('Content-Type', "text/plain; charset=UTF-8");
	
	user.heartbeat(req, res, function(){

		myutil.log("upload by " + req.userName);
		
		if (req.files && req.files.file && req.files.file.name && req.files.file.path){

			req.uploadedImage = {
				path: req.files.file.path,
				name: req.files.file.name,
				ext: "",
				device:""
			};
			
			var names = req.files.file.name.split(".");
			if (0 < names.length){
				var ext = names.pop();
				if (ext){
					req.uploadedImage.ext = ext.toString().toLowerCase();
				}
			}

			if (req.body && req.body.device){
				req.uploadedImage.device = req.body.device;
			}

			myutil.log(req.uploadedImage);

			if ("jpg" == req.uploadedImage.ext
				|| "jpg" == req.uploadedImage.ext){
				_uploadJPG(req, res);
			}else if ("pdf" == req.uploadedImage.ext){
				_uploadPDF(req, res);
			}else if ("png" == req.uploadedImage.ext){
				_uploadCore(req, res);
			}else{
				res.end(myutil.buildJSONPResponse(req, {'stat': 'ng', 'error':'non-image file'}));
			}
			
		}else{
			res.end(myutil.buildJSONPResponse(req, {'stat': 'ok', path: ''}));
		}
	});
}

exports.convert = function(req,res){

	user.heartbeat(req, res, function(){
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

