//このファイルはUTF8nで保存されています
function ChatManager(){}
ChatManager.prototype = {

	FETCH_RETRY:300,
	FETCH_DEFAULT_INTERVAL:2000,
	FETCH_MAX_INTERVAL:20000,
	FETCH_FIRST:2000,
	DEFAULT_LINE_COLOR:"#0000ff",
	DEFAULT_LINE_WIDTH:2,

	CONFIRM_TEXT_CLEARLINES:"すべての線を消去しますか？",
	CONFIRM_TEXT_CLEARIMAGE:"背景画像を消去しますか？",
	
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
	m_textCover:null,
	m_textCoverBG:null,
	m_textCoverInputArea:null,
	m_textInput:null,
	m_textX:0,
	m_textY:0,
	
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
		if (localStorage && 'color' in localStorage){
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
		this.m_textCover = $("#textCover");
		this.m_textCoverBG = $("#textCover .textCoverBG").click(function(){_this.onTextCoverBGClicked()});
		this.m_textCoverInputArea = $("#textCover .textInputArea").hide();
		this.m_textInput = $("#textInput").keydown(function(){_this.onTextInputKeyDown();});
		$("#textOKBtn").click(function(){_this.onTextOKBtnClicked();});
		$("#textCancelBtn").click(function(){_this.onTextCancelBtnClicked();});
//		$(window).keydown(function(){_this.onWindowKeyDown();});
						  
		setTimeout(function(){_this.onResized();}, 500);
		setTimeout(function(){_this.fetch();}, this.FETCH_FIRST);
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
//		dbg(this.m_fetchInterval);
			
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
				obj.owner = event.userName;
	
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
		function componentToHex(c) {
		    var hex = c.toString(16);
		    return hex.length == 1 ? "0" + hex : hex;
		}
		function rgbToHex(r, g, b) {
		    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
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

		dbg(events);
		this.m_sendEvents = [];
		$.ajax({
			type: "POST",
			url: "./api/event/send",
			data: {
				events: eventList,
				instanceId: this.m_instanceId
			},
			success:function(data){
				if (callback){
					callback();
				}
			}
		});
	},

	onColorChanged:function(color){
		this.m_lineColor = color;
		dbg(color);
		if (this.m_canvasMgr){
			this.m_canvasMgr.setColor(color);
		}

		if (localStorage){
			localStorage.color = color;
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
		this.sendEvents(function(data){
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
		var file = $("#uploadFile").val();
		if (!file){
			return;
		}
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
		this.m_textCover.removeClass("hidden");
		this.m_textCoverInputArea.hide()
	},
	
	onTextCoverBGClicked:function(){
		this.m_textX = event.clientX;
		this.m_textY = event.clientY - 9;
		this.m_textCoverInputArea.show().css({
			left: this.m_textX + "px",
			top: this.m_textY + "px"
		});
		this.m_textInput[0].focus();
	},

	onTextOKBtnClicked:function(){
		this.inputText();
		this.m_textCover.addClass("hidden");
		this.m_textInput.val("")
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
	},

	onTextCancelBtnClicked:function(){
		this.m_textCover.addClass("hidden");
	},

	onTextInputKeyDown:function(){
		if (13 == event.keyCode){
			this.onTextOKBtnClicked();
		}else if (27 == event.keyCode){
			this.onTextCancelBtnClicked();
		}
		event.cancelBubble = true;
	},

	onWindowKeyDown:function(){
		if (!this.m_textCover.hasClass("hidden")){
			this.onTextCancelBtnClicked();
		}
	},
	
	dummy:null
};
