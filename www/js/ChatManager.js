function ChatManager(){}
ChatManager.prototype = {

	FETCH_RETRY:300,
	FETCH_DEFAULT_INTERVAL:2000,
	FETCH_MAX_INTERVAL:20000,
	FETCH_FIRST:1500,
	
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
		
		this.m_cover = $("#cover");
		this.m_instanceId = "" + Math.ceil(Math.random() * 10000);
		this.m_sendEvents = [];
		this.m_canvasElm = $("#canvas");
		this.m_canvasMgr = new CanvasManager();
		this.m_canvasMgr.init(this.m_instanceId, $("#wrap"), this.m_canvasElm, $("#bgCanvas"));

		this.m_cover.css("line-height", $("#wrap").height()+"px");
		
		this.m_canvasElm.bind("objectDeleted", function(e, obj){
			_this.onDrawingObjectDeleted(obj);
		});
		this.m_canvasElm.bind("objectAdded", function(e, obj){
			_this.onDrawingObjectAdded(obj);
		});

		var _color = "#0000ff";
		if (localStorage && 'color' in localStorage){
			_color = localStorage.color;
		}
		$("#color").farbtastic(function(color){_this.onColorChanged(color);}).setColor(_color);
		
		$("#sensitivityInput").change(function(){_this.onSensitivityChanged($(this).val());});
		$("#lineWidthInput").change(function(){_this.onLineWidthChanged($(this).val());});
		$("#undo").click(function(){_this.onUndo();});
		$("#clearLines").click(function(){_this.onClearLines();});

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
		
	},

	fetch:function(){
		dbg(this.m_fetchInterval);
			
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
		
		if (this.m_hideCoverTimer){
			return;
		}
		this.m_cover.fadeOut();
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
		if (!data.events || !data.events.length){
			this.setNextFetch();
			this.m_fetchInterval+=500;
			if (this.FETCH_MAX_INTERVAL < this.m_fetchInterval){
				this.m_fetchInterval = this.FETCH_MAX_INTERVAL;
			}
			return;
		}
		this.m_fetchInterval = this.FETCH_DEFAULT_INTERVAL;

		if (data.users){
			var list = $("#users ul").empty();
			for(var i=0;i<data.users.length;i++){
				$("<li>").text(data.users[i].name).appendTo(list);
			}
		}
		
		var events = data.events;
		var lastEvent = events[events.length-1];
		
		dbg(data);

		var clearLineIndex = -1;
		var deleteIds = [];
		var addObjects = [];
		for(var i=events.length-1;i>=0;i--){
			var event = events[i];
			var action = event.action;

			if ("lineclear" == action){
				clearLineIndex = i;
				break;
			}
			
			var obj = new DrawingObject();
			obj.initWithJSONString(event.value);

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
		for (var i=0;i<addObjects.length;i++){
			this.m_canvasMgr.addObject(addObjects[i]);
		}
		this.m_canvasMgr.deleteObjects(deleteIds);
		this.m_lastFetchedEventId = lastEvent.id
		this.setNextFetch();
	},

	setNextFetch:function(){
		var _this = this;
		setTimeout(function(){
			_this.fetch();
		},this.m_fetchInterval);
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
				value: (event.obj ? event.obj.toJSONString() : "")
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
		if (this.m_canvasMgr){
			this.m_canvasMgr.setColor(color);
		}

		if (localStorage){
			localStorage.color = color;
		}
	},

	onLineWidthChanged:function(val){
		if (this.m_canvasMgr){
			this.m_canvasMgr.setLineWidth(parseInt(val, 10));
		}
	},

	onSensitivityChanged:function(val){
		if (this.m_canvasMgr){
			this.m_canvasMgr.setSensitivity(parseInt(val, 10));
		}
	},

	onUndo:function(){
		if (this.m_canvasMgr){
			this.m_canvasMgr.undo();
		}	
	},

	onClearLines:function(){
		if (this.m_canvasMgr){
			this.m_canvasMgr.clear();
		}
		this.m_cover.fadeIn();
		
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
	
	dummy:null
};
