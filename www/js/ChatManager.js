function ChatManager(){}
ChatManager.prototype = {

	m_canvasMgr:null,
	m_timer:null,
	m_instanceId:"",
	
	init:function(){
		var _this = this;
		$(window).resize(function(){
			if(_this.m_timer){
				clearTimeout(_this.m_timer);
			}
			_this.m_timer=setTimeout(function(){
				_this.onResized();
			},500);
		});

		this.m_instanceId = "" + Math.ceil(Math.random() * 10000);

		this.m_canvasElm = $("#canvas");
		this.m_canvasMgr = new CanvasManager();
		this.m_canvasMgr.init(this.m_instanceId, $("#wrap"), this.m_canvasElm, $("#bgCanvas"));

		this.m_canvasElm.bind("objectDeleted", function(e, obj){
			_this.onDrawingObjectDeleted(obj);
		});

		$("#color").farbtastic(function(color){_this.onColorChanged(color);})
			.setColor("#0000ff");
		$("#sensitivityInput").change(function(){_this.onSensitivityChanged($(this).val());});
		$("#lineWidthInput").change(function(){_this.onLineWidthChanged($(this).val());});
		$("#undo").click(function(){_this.onUndo();});

		setTimeout(function(){_this.onResized();}, 500);
	},

	onResized:function(){
		if (!this.m_canvasMgr){
			return;
		}
		this.m_canvasMgr.onResized();
		var height = this.m_canvasMgr.getHeight();
		$("#bg").css({width:height, height:height});
		$("#bgImg").css({width:height, height:height});
	},

	onDrawingObjectDeleted:function(obj){
		dbg("Deleted: id=" + obj.id);
	},

	onColorChanged:function(color){
		if (this.m_canvasMgr){
			this.m_canvasMgr.setColor(color);
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
	
	dummy:null
};
