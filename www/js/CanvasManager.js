function CanvasManager(){}
CanvasManager.prototype = {

	BASE_SIZE:640,
	m_instanceId:"",
	m_step:3,
	m_wrap:null,
	m_elm:null,
	m_bg:null,
	m_width:0,
	m_height:0,
	m_context:null,
	m_bgContext:null,
	m_isHover:false,
	m_isDragging:false,
	m_mouseX:0,
	m_mouseY:0,
	m_startX:0,
	m_startY:0,
	m_bgObjects:[],
	m_color:"rgba(255,0,255,1)",
	m_lineWidth:2,
	m_objSerial:1,

	m_currentObj:null,
	
	init:function(instanceId, $wrap, $elm, $bg){
		var _this = this;

		this.m_instanceId = instanceId;
		this.m_wrap = $wrap;
		this.m_elm = $elm;
		this.m_bg = $bg;
		this.m_context = this.m_elm[0].getContext('2d');
		this.m_bgContext = this.m_bg[0].getContext('2d');
		
		this.m_elm.bind("mousedown", function(e){_this.onMouseDown(e);});
		this.m_elm.bind("mouseup", function(e){_this.onMouseUp(e);});
		this.m_elm.bind("mouseover", function(e){_this.onMouseOver(e);});
		this.m_elm.bind("mouseout", function(e){_this.onMouseOut(e);});
		this.m_elm.bind("mousemove", function(e){_this.onMouseMove(e);});

		this.m_bgObjects = [];
	},

	onResized:function(){
		this.m_height = this.m_wrap.height();
		this.m_width = this.m_height;
		
		dbg("canvas resized: height:" + this.m_height);
		
		this.m_elm.attr({width:this.m_width});
		this.m_elm.attr({height:this.m_height});
		this.m_bg.attr({width:this.m_width});
		this.m_bg.attr({height:this.m_height});

		this.redrawBG();
	},

	getHeight:function(){
		return this.m_height;
	},

	setColor:function(str){
		if (str.match(/#([a-zA-Z0-9][a-zA-Z0-9])([a-zA-Z0-9][a-zA-Z0-9])([a-zA-Z0-9][a-zA-Z0-9])/i)){
			var r = parseInt(RegExp.$1, 16);
			var g = parseInt(RegExp.$2, 16);
			var b = parseInt(RegExp.$3, 16);
			this.m_color = "rgba(" + r + "," + g + "," + b + ",1)";
		}
	},

	setLineWidth:function(w){
		this.m_lineWidth = w;
	},

	setSensitivity:function(n){
		this.m_step = n;
	},
	
	redrawBG:function(){
		this.m_bgContext.clearRect(0, 0, this.m_width, this.m_height);
		for(var i=0;i<this.m_bgObjects.length;i++){
			var obj = this.m_bgObjects[i];
			this.drawLine(obj, this.m_bgContext);
		}
	},

	undo:function(){
		if (0 < this.m_bgObjects.length){
			var popped = this.m_bgObjects.pop();
			this.redrawBG();
			this.m_elm.trigger("objectDeleted", [popped]);
		}
	},
	
	onMouseDown:function(e){
		e.stopPropagation();
		e.preventDefault();
		if (!this.m_isDragging){
			this.m_isDragging = true;

			var offset = this.m_elm.offset();
			this.m_mouseX = e.clientX + offset.left;
			this.m_mouseY = e.clientY + offset.top;
			this.onStartDragging();
		}
	},
	onMouseUp:function(e){
		e.stopPropagation();
		if (this.m_isDragging){
			this.m_isDragging = false;
			this.onStopDragging();
		}
	},
	onMouseOver:function(e){
		e.stopPropagation();
		this.m_isHover = true;
	},
	onMouseOut:function(e){
		e.stopPropagation();
		this.m_isHover = false;
		if (this.m_isDragging){
			this.m_isDragging = false;
			this.onStopDragging();
		}
	},
	onMouseMove:function(e){
		e.stopPropagation();
		e.preventDefault();
		if (!this.m_isDragging){
			return;
		}
		
		var offset = this.m_elm.offset();
		this.m_mouseX = e.clientX + offset.left;
		this.m_mouseY = e.clientY + offset.top;
		this.onDrag();
	},

	onStartDragging:function(){
		this.m_currentObj = new DrawingObject();
		this.m_currentObj.init(this.m_instanceId, (this.m_objSerial++), this.m_color, this.m_lineWidth);
		this.addCurrentPoint();
	},

	onStopDragging:function(){
		this.m_bgContext.drawImage(this.m_elm[0], 0,0);
		this.m_context.clearRect(0, 0, this.m_width, this.m_height);
		this.m_currentObj.smooth(this.m_step);
		this.m_bgObjects.push(this.m_currentObj);

		var json = this.m_currentObj.toJSONString();
		$("#dbg").text(json);
	},

	addObject:function(obj){
		this.m_bgObjects.push(obj);
		this.drawLine(obj, this.m_bgContext);
	},

	deleteObjecst:function(objectIds){
		for(var i=0;i<objectIds.length;i++){
			var objectId = objectIDs[i];
			for (var j=this.m_bgObjects.length-1;j>=0;j--){
				if(objectId = this.m_bgObjects[j].id){
					this.m_bgObjects.splice(j,1);
				}
			}
		}
	},

	onDrag:function(){
		this.addCurrentPoint();
		this.drawLine(this.m_currentObj, this.m_context);
	},

	addCurrentPoint:function(){
		this.m_currentObj.addPoint(
			this._myRound(this.m_mouseX / this.m_width),
			this._myRound(this.m_mouseY / this.m_height)
			);
	},

	_myRound:function(n){
		return Math.round(n * 10000) / 10000;
	},

	_pc2px:function(pc){
		return {
			x: pc.x * this.m_width,
			y: pc.y * this.m_height
		};
	},
	
	drawLine:function(obj, ctx){
		this.m_context.clearRect(0, 0, this.m_width, this.m_height);

		var step = obj.smoothed ? 1 : this.m_step;
		var points = obj.points;
		
		var pointCount = points.length;
		if (!pointCount){
			return;
		}
		ctx.beginPath();
		var lastPoint = this._pc2px(points[0]);
		ctx.moveTo(lastPoint.x, lastPoint.y);

		var mX, mY, point;
		if (1 < pointCount){
			point = this._pc2px(points[1]);
			mX = (point.x + lastPoint.x) / 2.0;
			mY = (point.y + lastPoint.y) / 2.0;
		    ctx.lineTo(mX, mY);
			lastPoint = point;
		}
		for(i=2;i<pointCount;i+=step){
			point = this._pc2px(points[i]);
			mX = (point.x + lastPoint.x) / 2.0;
			mY = (point.y + lastPoint.y) / 2.0;
			ctx.quadraticCurveTo(lastPoint.x,
											lastPoint.y,
											mX,
											mY);
			lastPoint = point;
		}
		point = this._pc2px(points[pointCount-1]);
		ctx.lineTo(point.x, point.y);

		ctx.lineWidth = obj.lineWidth * this.m_height / this.BASE_SIZE;
		ctx.strokeStyle = obj.color;
		ctx.stroke();
	},
	
	dummy:null
};
