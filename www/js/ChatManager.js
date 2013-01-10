/*
 * Chat2
 * Copyright 2013, Kentaro Kai
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
*/

/*このファイルはUTF8nで保存されています*/

var ChatManagerConfig = {
	SOCKETIO_ENABLED: true,
	SOCKETIO_DOMAIN: location.protocol + "//" + location.hostname,
	SOCKETIO_PORT: 3000,
	SOCKETIO_MININTERVAL:30
	};

(function(){
/*
	if (location.search){
		var q = "" + location.search;
		if (q.match(/realtime/)){
			ChatManagerConfig.SOCKETIO_ENABLED = true;
			window.console && window.console.log && window.console.log("== USE SocketIO ==");
		}
	}
*/	
	if (ChatManagerConfig.SOCKETIO_ENABLED){
		var url = ChatManagerConfig.SOCKETIO_DOMAIN + ":" + ChatManagerConfig.SOCKETIO_PORT + "/socket.io/socket.io.js";
		document.write("<script type='text/javascript' src='" + url + "'></script>");
	}
})();
 
function ChatManager(){}
ChatManager.prototype = {

	FETCH_RETRY:300,
	FETCH_DEFAULT_INTERVAL:3000,
	FETCH_MAX_INTERVAL:20000,
	FETCH_FIRST:2000,
	DEFAULT_LINE_COLOR:"#0000ff",
	DEFAULT_LINE_WIDTH:2,

	CONFIRM_TEXT_CLEARLINES:"Do you want to erase all LINEs and TEXTs?",
	CONFIRM_TEXT_CLEARIMAGE:"Do you want to remove the background image?",
	
	m_canvasMgr:null,
	m_resizeTimer:null,
	m_instanceId:"",
	m_sendEvents:[],
	m_sendEventsTimer:null,
	m_inFetchRequest:false,
	m_lastFetchedEventId:0,
	m_preventFetch:false,
	m_cover:null,
	m_hideCoverTimer:null,
	m_fetchInterval:0,
	m_lineColor:"",
	m_lineWidth:0,
	m_bgImage:null,
	m_myName:"",
	m_userLineSettings:null,
	m_coverLock:false,
	m_toolCover:null,
	m_toolCoverBG:null,
	m_toolCoverBG2:null,
	m_toolCoverInputArea:null,
	m_textInput:null,
	m_textX:0,
	m_textY:0,
	m_socket:null,
	m_socketConnected:false,
	
	init:function(){
		var _this = this;
		$(window).resize(function(){
			if(_this.m_resizeTimer){
				clearTimeout(_this.m_resizeTimer);
			}
			_this.m_resizeTimer=setTimeout(function(){
				_this.onResized();
			},500);
		});

		if(!!('ontouchstart' in window)){
			$("body").addClass("touch");
		}
		if(!!('onmousedown' in window)){
			$("body").addClass("mouse");
		}
		
		this.m_fetchInterval = this.FETCH_DEFAULT_INTERVAL;
		this.m_userLineSettings = {};
		
		this.m_cover = $("#cover");
		this.m_instanceId = "" + Math.ceil(Math.random() * 10000);
		this.m_sendEvents = [];
		this.m_canvasElm = $("#canvas");
		this.m_canvasMgr = new CanvasManager();
		this.m_canvasMgr.init(this.m_instanceId, $("#wrap"), this.m_canvasElm, $("#bgCanvas"));
		this.m_canvasMgr.setLineWidth(this.DEFAULT_LINE_WIDTH);

		this.m_cover.css("line-height", $("#wrap").height()+"px").addClass("animate");
		
		this.m_canvasElm.bind("objectDeleted", function(e, obj){
			_this.onDrawingObjectDeleted(obj);
		});
		this.m_canvasElm.bind("objectAdded", function(e, obj){
			_this.onDrawingObjectAdded(obj);
		});

		this.m_lineColor = this.DEFAULT_LINE_COLOR;
		if (Modernizr.localstorage
			&& localStorage
			&& 'color' in localStorage){
			this.m_lineColor = localStorage.color;
		}
		$("#color").farbtastic(function(color){_this.onColorChanged(color);}).setColor(this.m_lineColor);

		this.m_lineWidth = this.DEFAULT_LINE_WIDTH;
		$("#lineWidthSlider").slider({
				min: 1,
				max: 15,
				step: 0.1,
				value: this.m_lineWidth,
				slide: function(event, ui){
					_this.onLineWidthChanged(ui.value);
				}
			});
		
		$("#sensitivityInput").change(function(){_this.onSensitivityChanged($(this).val());});
		$("#undo").click(function(){_this.onUndo();}).attr("disabled",1);
		$("#clearLines").click(function(){_this.onClearLines();});

		$("#uploadBtn").click(function(){_this.onUploadClick();return false});
		$("#cleagImgBtn").click(function(){_this.onClearImageClick();return false}).attr("disabled",1);
		$("#downloadBtn").click(function(){_this.onDownloadClick();return false});

		$(window).bind("keydown.ctrl_z keydown.meta_z", function(){_this.onUndo();});

		$("#textBtn").click(function(){_this.onTextBtnClicked();});
		$("#circleBtn").click(function(){_this.onCircleBtnClicked();});
		$("#rectBtn").click(function(){_this.onRectBtnClicked();});
		this.m_toolCover = $("#toolCover");
		this.m_toolCoverBG = $("#toolCover .toolCoverBG").click(function(e){_this.onToolCoverBGClicked(e)});
		this.m_toolCoverBG2 = $("#toolCover .toolCoverBG2");
		this.m_toolCoverInputArea = $("#toolCover .textInputArea").hide();
		this.m_textInput = $("#textInput").keydown(function(e){_this.onTextInputKeyDown(e);});
		$("#textOKBtn").click(function(){_this.onTextOKBtnClicked();});
		$("#toolCancelBtn").click(function(){_this.onToolCancelBtnClicked();});
//		$(window).keydown(function(){_this.onWindowKeyDown();});
						  
		setTimeout(function(){_this.onResized();}, 500);
		setTimeout(function(){_this.fetch();}, this.FETCH_FIRST);

		dbg("Instance ID:" + this.m_instanceId);

		// Drag & Drop
		if (Modernizr.draganddrop
			&& Modernizr.xhr2
			&& window.File){
			
			dbg("== Drag&Drop enabled ==");
			jQuery.event.props.push('dataTransfer');
			$("html").bind("drop", function(event){
				event.stopPropagation();
				event.preventDefault(); 
				if (event.dataTransfer
					&& event.dataTransfer.files
					&& event.dataTransfer.files.length){
					var file = event.dataTransfer.files[0];
					_this.uploadBGImageWithXHR2(file);
				}
			    
			}).bind("dragenter dragover", false);
		}

		// Socket.IO
		if (Modernizr.websockets
			&& ChatManagerConfig.SOCKETIO_ENABLED
			&& 'io' in window){
			this.m_canvasElm.bind("objectDrawing", function(e, obj){
				_this.onDrawingObjectDrawing(obj);
			});

			this.m_socket = io.connect(
		    	ChatManagerConfig.SOCKETIO_DOMAIN ,
				{
					port:ChatManagerConfig.SOCKETIO_PORT
				}
			);
			dbg( this.m_socket );
			this.m_socket.on('msg', function (data) {
				_this.onSocketIOMsgReceived(data);
			});	
		}
	},
	
	onResized:function(){
		if (!this.m_canvasMgr){
			return;
		}
		this.m_canvasMgr.onResized();
		var height = this.m_canvasMgr.getHeight();
		$("#bg").css({width:height, height:height}).removeClass("hidden");;
		$("#bgImg").css({width:height, height:height});
		this.updateLinePreview();
		this.updateUserLinePreview();
		this.m_cover.css("line-height", $("#wrap").height()+"px");

		var controlWidth = $("#control").width();
		this.m_toolCoverBG2.css("width", Math.max($("#wrap").width()-height, controlWidth) + "px");
	},

	updateLinePreview:function(){
		if (!this.m_canvasMgr){
			return;
		}
		var $parent = $("#linePreview");
		var $elm = $(".bar", $parent);

		var parentHeight = $parent.outerHeight();
		var width = this.m_canvasMgr.getRealLineWidth();
		$elm.css("background-color",this.m_lineColor)
			.css("height",width + "px").css("top", ((parentHeight - width) / 2.0) + "px");
			
	},

	fetch:function(){
			
		var _this = this;
		if (this.m_inFetchRequest || this.m_preventFetch){
			setTimeout(function(){
				_this.fetch();
			},this.FETCH_RETRY);
			return;
		}
		this.m_inFetchRequest = true;
		var data = {};
		if (this.m_lastFetchedEventId){
			data.from = this.m_lastFetchedEventId;
			data.exceptInstanceId = this.m_instanceId;
		}
		$.ajax({
			cache: false,
			/*dataType : "jsonp",*/
			type: "GET",
			url: "./api/event/fetch",
			data: data,
			success:function(data){_this.onFetchDataReceived(data);},
			error:function(){_this.onFetchError();}
		});
	},

	hideCover:function(){
		if (this.m_coverLock){
			return;
		}
		
		if (this.m_hideCoverTimer){
			return;
		}
		var $control = $("#control");
		if (!$control.hasClass("slidein")){
			$control.addClass("slidein");
		}
		this.m_cover.fadeOut(function(){
			$(this).removeClass("title");
		});
	},

	onFetchError:function(){
		this.m_inFetchRequest = false;
		this.setNextFetch();
	},

	onFetchDataReceived:function(data){
		if (!data || !data.stat || 'ok' != data.stat){
			this.onFetchError();
			return;
		}
		var _this = this;
		this.hideCover();
		
		this.m_inFetchRequest = false;

		if (data.user){
			this.m_myName = data.user.name;
			this.m_canvasMgr.setName(this.m_myName);
		}
		if (data.users){
			var list = $("#users ul").empty();
			for(var i=0;i<data.users.length;i++){
				var name = data.users[i].name;
				$("<li>").text(name).attr("data-name", name).appendTo(list);
			}
			this.updateUserLinePreview();
		}
		
		if (!data.events || !data.events.length){
			this.setNextFetch();
			this.m_fetchInterval+=500;
			if (this.FETCH_MAX_INTERVAL < this.m_fetchInterval){
				this.m_fetchInterval = this.FETCH_MAX_INTERVAL;
			}
			return;
		}
		this.m_fetchInterval = this.FETCH_DEFAULT_INTERVAL;
		
		var events = data.events;
		var lastEvent = events[events.length-1];
		
		dbg(data);

		var clearLineIndex = -1;
		var deleteIds = [];
		var addObjects = [];
		var bgImagePath = null;
		for(var i=events.length-1;i>=0;i--){
			var event = events[i];
			var action = event.action;

			if ("lineclear" == action){
				clearLineIndex = i;
			}else if ("imageadd" == action){
				if (null === bgImagePath){
					bgImagePath = event.value;
				}
			}else if ("imagedelete" == action){
				if (null === bgImagePath){
					bgImagePath = "";
				}
			}else if (0 > clearLineIndex) {
				var obj = new DrawingObject();
				obj.initWithJSONString(event.value);
				//obj.owner = event.userName;
	
				if ("linedelete" == action){
					deleteIds.push(obj.id);
				}else if ("lineadd" == action){
					var id = obj.id;
					var deleted = false;
					for(var j=0;j<deleteIds.length;j++){
						if (id == deleteIds[j]){
							deleted = true;
							break;
						}
					}
					if (!deleted){
						addObjects.push(obj);
					}
				}
			}
		}

		if (0 <= clearLineIndex){
			this.m_canvasMgr.clear();
			if (this.m_lastFetchedEventId){
				this.m_cover.fadeIn();
				if (this.m_hideCoverTimer){
					clearTimeout(this.m_hideCoverTimer);
				}
				this.m_hideCoverTimer = setTimeout(function(){
					clearTimeout(_this.m_hideCoverTimer);
					_this.m_hideCoverTimer = null;
					_this.hideCover();
				},5000);
			}
		}
		
		for (var i=addObjects.length-1;i>=0;i--){
			var obj = addObjects[i];
			this.m_userLineSettings[obj.owner] = {color:obj.color};
			this.m_canvasMgr.addObject(addObjects[i]);
		}
		this.m_canvasMgr.deleteObjects(deleteIds);
		this.updateUserLinePreview();
		
		if (bgImagePath){
			this.setBGImage(bgImagePath);
		}else if ("" === bgImagePath){
			this.clearBGImage();
		}
		
		this.m_lastFetchedEventId = lastEvent.id
		this.setNextFetch();
	},

	setNextFetch:function(){
		var _this = this;
		setTimeout(function(){
			_this.fetch();
		},this.m_fetchInterval);
	},

	updateUserLinePreview:function(){
				
		function rgbToHex(r,g,b){
			return "#" + ("000000" + (r << 16 | g << 8 | b).toString(16)).slice(-6);
		}

		this.m_userLineSettings[this.m_myName] = {color:this.m_lineColor};
		
		var rgbaRegExp = new RegExp("rgba\\(([0-9\\.]+),([0-9\\.]+),([0-9\\.]+),[0-9\\.]+\\)");
		for(var name in this.m_userLineSettings){
			var obj = this.m_userLineSettings[name];
			var color = obj.color;
			if (color.match(rgbaRegExp)){
				color = rgbToHex(parseInt(RegExp.$1, 10),parseInt(RegExp.$2, 10),parseInt(RegExp.$3, 10));
			}
			$("#users ul li[data-name='" + name + "']").css("border-left-color", color);
		}
	},
	
	onDrawingObjectDeleted:function(obj){
		for (var i= this.m_sendEvents.length-1; i>=0; i--){
			var _event = this.m_sendEvents[i];
			if ("lineadd" == _event.action
				&& _event.obj.id == obj.id){
				this.m_sendEvents.splice(i, 1);
				return;
			}
		}
		
		this.m_sendEvents.push({action:"linedelete", obj: obj});
		this.trySendEvents();
	},

	onDrawingObjectAdded:function(obj){
		this.m_sendEvents.push({action:"lineadd", obj: obj});
		this.trySendEvents();
		$("#undo").removeAttr("disabled");
		this.hideToolCover();
	},

	trySendEvents:function(){
		var _this = this;
		if (!this.m_sendEvents.length){
			return;
		}
		if (this.m_sendEventsTimer){
			clearTimeout(this.m_sendEventsTimer);
		}
		this.m_sendEventsTimer = setTimeout(function(){
			_this.sendEvents(null);
		}, 300);
	},

	sendEvents:function(callback){
		if (!this.m_sendEvents.length){
			return;
		}
		this.m_fetchInterval = this.FETCH_DEFAULT_INTERVAL;
		
		var events = "[";
		var eventList = [];
		for (var i=0;i<this.m_sendEvents.length;i++){
			var event = this.m_sendEvents[i];
			var _obj = {
				action: event.action,
				value: (event.obj ? event.obj.toJSONString() : (event.value ? event.value : ""))
			};
			eventList.push(_obj);
			var eventStr = JSON.stringify(_obj);
			events += eventStr;
		}
		events += "]";

//		dbg(events);
		this.m_sendEvents = [];
		$.ajax({
			cache: false,
			/*dataType : "jsonp",*/
			type: "POST",
			url: "./api/event/send",
			data: {
				events: eventList,
				instanceId: this.m_instanceId,
				requestedAt: (new Date())
			},
			success:function(data){
				if (callback){
					callback(data);
				}
			}
		});
	},

	onColorChanged:function(color){
		this.m_fetchInterval = this.FETCH_DEFAULT_INTERVAL;
		this.m_lineColor = color;
	
		if (this.m_canvasMgr){
			this.m_canvasMgr.setColor(color);
		}

		if (Modernizr.localstorage
			&& localStorage){
			try{
				localStorage.color = color;
			}catch(err){
			}
		}
		var _this = this;
		setTimeout(function(){
			_this.updateLinePreview();
			_this.updateUserLinePreview();
		},1);
	},

	onLineWidthChanged:function(val){
		var _this = this;
		if (this.m_canvasMgr){
			this.m_canvasMgr.setLineWidth(parseInt(val, 10));
			setTimeout(function(){
				_this.updateLinePreview();
				_this.updateUserLinePreview();
			},1);
		}
	},

	onSensitivityChanged:function(val){
		if (this.m_canvasMgr){
			this.m_canvasMgr.setSensitivity(parseInt(val, 10));
		}
	},

	onUndo:function(){
		if (this.m_canvasMgr){
			var enable = (this.m_canvasMgr.undo() > 0);
			if (!enable){
				$("#undo").attr("disabled","1");
			}
		}	
	},

	onClearLines:function(){
		if(!window.confirm(this.CONFIRM_TEXT_CLEARLINES)){
			return;
		}

		if (this.m_canvasMgr){
			this.m_canvasMgr.clear();
		}
		
		this.m_cover.fadeIn();
		$("#undo").attr("disabled","1");
		var _this = this;
		this.m_sendEvents.push({action:"lineclear", obj: null});
		this.m_coverLock = true;
		this.sendEvents(function(data){
			_this.m_coverLock = false;
			if (_this.m_hideCoverTimer){
				clearTimeout(_this.m_hideCoverTimer);
			}
			_this.m_hideCoverTimer = setTimeout(function(){
				clearTimeout(_this.m_hideCoverTimer);
				_this.m_hideCoverTimer = null;
				_this.hideCover();
			},5000);
			dbg(data);
		});
	},

	onDownloadClick:function(){
		if (!this.m_canvasMgr){
			return;
		}
		var data = this.m_canvasMgr.makeImageData(this.m_bgImage);
		if (!data){
			return;
		}
		$("#downloadFormData").val(data);
		$("#downloadForm")[0].submit();
	},

	onClearImageClick:function(){
		if(!window.confirm(this.CONFIRM_TEXT_CLEARIMAGE)){
			return;
		}
		
		this.clearBGImage();
		this.m_sendEvents.push({action:"imagedelete"});
		this.sendEvents(null)
	},

	onUploadClick:function(){
		var _this = this;
		var elm = $("#uploadFile");
		var file = elm.val();
		if (!file){
			return;
		}

		this.m_fetchInterval = this.FETCH_DEFAULT_INTERVAL;
		
		if (Modernizr.xhr2
			&& window.File
			&& elm[0].files
			&& elm[0].files.length){
			var file = elm[0].files[0];
			this.uploadBGImageWithXHR2(file);
		}else{
			dbg("Upload file with jQuery.upload");
			
			this.m_coverLock = true;
			this.m_cover.fadeIn(400,function(){
				dbg('start uploading');
		        $('#uploadFields').upload('./api/image/upload', function(res) {
					dbg(res);
					_this.m_coverLock = false;
					_this.hideCover();
					if (res && "ok" == res.stat && res.path){
						_this.onImageUploaded(res);
					}else{
						_this.hideCover();
					}
		        }, 'json');
			});
		}
	},

	uploadBGImageWithXHR2:function(file){
		if (!file || !Modernizr.xhr2 || !window.File){
			return;
		}

		dbg("Upload file with XHR2");
		dbg(file);
		this.m_fetchInterval = this.FETCH_DEFAULT_INTERVAL;
		
		var _this = this;
		this.m_coverLock = true;
		this.m_cover.fadeIn(400,function(){
			var formData = new FormData();
			formData.append('file', file); // Append extra data before send.
			var xhr = new XMLHttpRequest();
			xhr.open('POST', "./api/image/upload", true);
			xhr.onload = function(e) {
				if (e.target && e.target.response){
					dbg(e.target.response);
					_this.m_coverLock = false;
					_this.hideCover();
					var res = JSON.parse(e.target.response);
					if (res && "ok" == res.stat && res.path){
						_this.onImageUploaded(res);
					}else{
						_this.hideCover();
					}
				}
			};
			if (xhr.upload && 'onprogress' in xhr.upload){
				xhr.upload.onprogress = function(e) {
					if (e.lengthComputable) {
						var progress =  (e.loaded / e.total) * 100;
						dbg("Uploading: " + progress + "%");
					}
				};
			}
			xhr.send(formData);
		});
	},

	onImageUploaded:function(data){
		dbg(data.path);
		var url = data.path;
		url += "?_=" + Math.floor(Math.random() * 1000000);
		this.setBGImage(url);
		this.m_sendEvents.push({action:"imageadd", value: url});
		this.sendEvents(null);
	},

	setBGImage:function(url){
		var elm = $("#bgImg");
		if (url){
			elm.css("background-image", "url(" + url + ")");
			var img = new Image();
			img.src = url;
			var _this = this;
			img.onload = function(){
				_this.m_bgImage = img;
				
			}
			img.onerror = function(){
				
			}
			$("#cleagImgBtn").removeAttr("disabled");
		}else{
			elm.css("background-image", "");
			this.m_bgImage = null;
			$("#cleagImgBtn").attr("disabled",1);
		}
	},

	clearBGImage:function(){
		this.setBGImage("");
	},

	onTextBtnClicked:function(){
		this.m_fetchInterval = this.FETCH_DEFAULT_INTERVAL;
		this.m_toolCover.removeClass("hidden").addClass("text");
		this.m_toolCoverInputArea.hide();
		$(".toolHowTo", this.m_toolCover).addClass("slidein");
		$("#toolCancelBtn").addClass("slidein");
	},

	onCircleBtnClicked:function(){
		this.m_fetchInterval = this.FETCH_DEFAULT_INTERVAL;
		this.m_toolCover.removeClass("hidden").addClass("circle");
		this.m_toolCoverInputArea.hide();
		$(".toolHowTo", this.m_toolCover).addClass("slidein");
		$("#toolCancelBtn").addClass("slidein");
		this.m_canvasMgr.setMode(CanvasManagerMode.DRAWCIRCLE);
	},

	onRectBtnClicked:function(){
		this.m_fetchInterval = this.FETCH_DEFAULT_INTERVAL;
		this.m_toolCover.removeClass("hidden").addClass("rect");
		this.m_toolCoverInputArea.hide();
		$(".toolHowTo", this.m_toolCover).addClass("slidein");
		$("#toolCancelBtn").addClass("slidein");
		this.m_canvasMgr.setMode(CanvasManagerMode.DRAWRECT);
	},

	
	hideToolCover:function(){
		this.m_toolCover.addClass("hidden").removeClass("text").removeClass("circle").removeClass("rect");
		$(".toolHowTo", this.m_toolCover).removeClass("slidein");
		$("#toolCancelBtn").removeClass("slidein");
		this.m_canvasMgr.setMode(CanvasManagerMode.DEFAULT);
	},
	
	onToolCoverBGClicked:function(e){
		if (!this.m_toolCover.hasClass("text")){
			return;
		}
		this.m_textX = e.clientX;
		this.m_textY = e.clientY - 9;
		this.m_toolCoverInputArea.show().css({
			left: this.m_textX + "px",
			top: this.m_textY + "px"
		});
		this.m_textInput[0].focus();
	},

	onTextOKBtnClicked:function(){
		this.inputText();
		this.m_textInput.val("");
		this.hideToolCover();
	},

	inputText:function(){
		var text = $.trim(this.m_textInput.val());
		if (!text){
			return;
		}
		var obj = this.m_canvasMgr.addText(text,
								 this.m_textX + 2,
								 this.m_textY + 17);
		this.onDrawingObjectAdded(obj);
		this.onDrawingObjectDrawing(obj);
	},

	onToolCancelBtnClicked:function(){
		this.hideToolCover();
	},

	onTextInputKeyDown:function(e){
		if (13 == e.keyCode){
			this.onTextOKBtnClicked();
		}else if (27 == e.keyCode){
			this.onToolCancelBtnClicked();
		}
		e.cancelBubble = true;
	},

	onWindowKeyDown:function(){
		if (!this.m_toolCover.hasClass("hidden")){
			this.onToolCancelBtnClicked();
		}
	},

	onSocketIOMsgReceived:function(data){

		if (!this.m_socketConnected){
			this.m_socketConnected = true;
			dbg("== Socket.IO connected ==");
		}
		
		this.m_fetchInterval = this.FETCH_DEFAULT_INTERVAL;
		if ("DrawingObject" == data.type && data.data && this.m_canvasMgr){
			var obj = new DrawingObject();
			obj.initWithJSONString(data.data);
			this.m_canvasMgr.addOthersObject(obj);
		}else if ("Message" == data.type){
			dbg("SocketIO Msg Received: " + JSON.stringify(data));
		}
	},

	sendSocketIOMsgToOthers:function(type, data){
		if (!this.m_socket || !this.m_socketConnected){
			return;
		}
		var obj = {
			from: this.m_myName,
			instanceId: this.m_instanceId,
			type: type,
			data: data
		};
		this.m_socket.emit('others', obj);
	},

	m_drawingObjEventTimers:null,
	
	onDrawingObjectDrawing:function(obj){
		if (!this.m_socket || !this.m_socketConnected){
			return;
		}
		if (!this.m_drawingObjEventTimers){
			this.m_drawingObjEventTimers = {};
		}

		//this._sendSocketIODrawingObjToOthers(obj);
		//return;
		
		var key = "key" + obj.id;
		if (key in this.m_drawingObjEventTimers){
			return;
		}
		var _this = this;
		var timer = setTimeout(function(){
				_this._sendSocketIODrawingObjToOthers(obj);
				if (key in _this.m_drawingObjEventTimers){
					delete _this.m_drawingObjEventTimers[key];
				}
		},ChatManagerConfig.SOCKETIO_MININTERVAL);
	
		this.m_drawingObjEventTimers[key] = timer;
	},

	_sendSocketIODrawingObjToOthers:function(obj){
		var cloned = obj.clone();
		if (!cloned.smoothed){
			cloned.smooth(3);
		}
		this.sendSocketIOMsgToOthers("DrawingObject", cloned.toJSONString());
	},
	
	dummy:null
};
