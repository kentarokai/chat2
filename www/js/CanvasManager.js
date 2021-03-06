/*
 * Chat2
 * Copyright 2013, Kentaro Kai
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
*/
CanvasManagerMode = {
	DEFAULT:1,
	DRAWCIRCLE:2,
	DRAWRECT:3,
	SELECT:4
}

function CanvasManager(){}
CanvasManager.prototype = {

	BASE_SIZE:640,
	OUTPUT_SIZE:1024,
	CTRL_DRAG_ANGLE_STEP:45,
	CIRCLE_BEZIER_CONST:0.5522847,
	m_instanceId:"",
	m_myName:"",
	m_mode:CanvasManagerMode.DEFAULT,
	m_step:3,
	m_drawer:null,
	m_mapDrawer:null,
	m_selectionDrawer:null,
	m_wrap:null,
	m_elm:null,
	m_bg:null,
	m_width:0,
	m_height:0,
	m_context:null,
	m_bgContext:null,
	m_isDragging:false,
	m_mouseX:0,
	m_mouseY:0,
	m_startX:0,
	m_startY:0,
	m_bgObjects:[],
	m_color:"rgba(255,0,255,1)",
	m_lineWidth:2,
	m_currentObj:null,
	m_mapCanvas:null,
	m_mapContext:null,
	m_othersCanvas:null,
	m_othersContext:null,
	m_othersInfo:null,
	m_lastOthersDrawTime:0,
	m_redrawOthersTimer:null,
	
	init:function(instanceId, $wrap, $elm, $bg){
		var _this = this;

		this.m_instanceId = instanceId;
		this.m_wrap = $wrap;
		this.m_elm = $elm;
		this.m_bg = $bg;
		this.m_context = this.m_elm[0].getContext('2d');
		this.m_bgContext = this.m_bg[0].getContext('2d');

//		this.m_mapCanvas = $("<canvas/>");
//		this.m_mapCanvas.insertBefore(this.m_bg);
//		this.m_mapContext = this.m_mapCanvas[0].getContext('2d');

		this.m_othersCanvas = $("<canvas/>");
		this.m_othersCanvas.insertBefore(this.m_bg).css("z-index",4);
		this.m_othersContext = this.m_othersCanvas[0].getContext('2d');

		if ($("body").hasClass("mouse")){
			this.m_elm.bind("mousedown", function(e){_this.onMouseDown(e);});
			this.m_elm.bind("mouseup", function(e){_this.onMouseUp(e);});
			this.m_elm.bind("mouseout", function(e){_this.onMouseOut(e);});
			this.m_elm.bind("mousemove", function(e){_this.onMouseMove(e);});
		}
		
		if ($("body").hasClass("touch")){
			this.m_elm.bind("touchstart", function(e){_this.onTouchStart(e);});
			this.m_elm.bind("touchmove", function(e){_this.onTouchMove(e);});
			this.m_elm.bind("touchend", function(e){_this.onTouchEnd(e);});
		}

		if ($("body").hasClass("mspointer")){
			this.m_elm[0].addEventListener("MSPointerDown", function(e){_this.onMSPointerDown(e);}, false);
			this.m_elm[0].addEventListener("MSPointerUp", function(e){_this.onMSPointerUp(e);}, false);
			this.m_elm[0].addEventListener("MSPointerOut", function(e){_this.onMSPointerOut(e);}, false);
			this.m_elm[0].addEventListener("MSPointerMove", function(e){_this.onMSPointerMove(e);}, false);
	
		}

		this.m_bgObjects = [];
		this.m_othersInfo = {};
	},

	setName:function(name){
		this.m_myName = name;
	},

	setMode:function(mode){
		this.m_mode = mode;
	},

	onResized:function(){
		if ($("body").hasClass("iphone")){
			this.m_width = this.m_wrap.width();
			this.m_height = this.m_width;
			
			this.m_elm.attr({width:this.m_width});
			this.m_elm.attr({height:this.m_height});
			this.m_bg.attr({width:this.m_width});
			this.m_bg.attr({height:this.m_height});
			if (this.m_mapCanvas){
				this.m_mapCanvas.attr({width:this.m_width});
				this.m_mapCanvas.attr({height:this.m_height});
				this.m_mapCanvas.css({
					position:"absolute",
					top:"0px",
					left:"0px"
					});
			}
			if (this.m_othersCanvas){
				this.m_othersCanvas.attr({width:this.m_width});
				this.m_othersCanvas.attr({height:this.m_height});
				this.m_othersCanvas.css({
					position:"absolute",
					top:"0px",
					left:"0px"
					});
			}
		}else{
			this.m_height = this.m_wrap.height();
			this.m_width = this.m_height;
			
			dbg("canvas resized: height:" + this.m_height);
			
			this.m_elm.attr({width:this.m_width});
			this.m_elm.attr({height:this.m_height});
			this.m_bg.attr({width:this.m_width});
			this.m_bg.attr({height:this.m_height});
			if (this.m_mapCanvas){
				this.m_mapCanvas.attr({width:this.m_width});
				this.m_mapCanvas.attr({height:this.m_height});
				this.m_mapCanvas.css({
					position:"absolute",
					top:"0px",
					left:this.m_width + "px"
					});
			}
			if (this.m_othersCanvas){
				this.m_othersCanvas.attr({width:this.m_width});
				this.m_othersCanvas.attr({height:this.m_height});
				this.m_othersCanvas.css({
					position:"absolute",
					top:"0px",
					left:"0px"
					});
			}
		}
		this.redrawBG();
	},

	getHeight:function(){
		return this.m_height;
	},

	getWidth:function(){
		return this.m_width;
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

	getRealLineWidth:function(){
		return this.m_lineWidth * this.m_height / this.BASE_SIZE;
	},

	setSensitivity:function(n){
		this.m_step = n;
	},
	
	redrawBG:function(){
		this.m_bgContext.clearRect(0, 0, this.m_width, this.m_height);
		if (this.m_mapContext){
			this.m_mapContext.clearRect(0, 0, this.m_width, this.m_height);
		}
		for(var i=0;i<this.m_bgObjects.length;i++){
			var obj = this.m_bgObjects[i];
			this.draw(obj, this.m_bgContext);
			this.drawMap(obj);
		}
	},

	makeImageData:function(bgImage){
		var w = this.OUTPUT_SIZE;
		var h = this.OUTPUT_SIZE;
		var outCanvas = document.createElement('canvas');
		outCanvas.width = w;
		outCanvas.height = h;
		var outContext = outCanvas.getContext('2d');
		outContext.fillStyle = "white";
        outContext.fillRect(0, 0, w,h);
		
		if (bgImage){
			var sw = bgImage.width;
			var sh = bgImage.height;
			var dx,dy,dw,dh;
			if (sw > sh){
				dx = 0;
				dw = w;
				dh = dw * sh / sw;
				dy = (h - dh) / 2.0;
			}else{
				dy = 0;
				dh = h;
				dw = dh * sw / sh;
				dx = (w - dw) / 2.0;
			}
			outContext.drawImage(bgImage, dx, dy, dw, dh);
		}

		var widthSave = this.m_width;
		var heightSave = this.m_height;
		this.m_width = w;
		this.m_height = h;
		for(var i=0;i<this.m_bgObjects.length;i++){
			var obj = this.m_bgObjects[i];
			this.draw(obj, outContext);
		}
		this.m_width = widthSave;
		this.m_height = heightSave;
	
		var data = outCanvas.toDataURL();
		return data;
		/*
		var img = new Image();
		img.src = data;
		img.onload = function(){
			location.href = img.src;
		}
		*/
	},

	undo:function(){
		var removed = false;
		var remain = 0;
		for(var i= this.m_bgObjects.length-1; i>= 0; i--){
			var obj = this.m_bgObjects[i];
			if (obj.instanceId == this.m_instanceId){
				if (removed){
					remain++;
				}else{
					this.m_bgObjects.splice(i,1);
					this.redrawBG();
					this.m_elm.trigger("objectDeleted", obj);
					removed = true;
				}
			}
		}
		return remain;
	},

	clear:function(){
		this.m_bgObjects = [];
		this.m_context.clearRect(0, 0, this.m_width, this.m_height);
		this.m_bgContext.clearRect(0, 0, this.m_width, this.m_height);
		if (this.m_mapContext){
			this.m_mapContext.clearRect(0, 0, this.m_width, this.m_height);
		}
		if (this.m_othersContext){
			this.m_othersContext.clearRect(0, 0, this.m_width, this.m_height);
		}
		this.m_isDragging = false;
		this.m_currentObj = null;

		DrawingRandomIds.init();
	},

	addObject:function(obj){
		for(var i=0;i<this.m_bgObjects.length;i++){
			if (this.m_bgObjects[i].id == obj.id){
				return;
			}
		}
		this.m_bgObjects.push(obj);
		this.draw(obj, this.m_bgContext);
		this.drawMap(obj);

		var key = "key" + obj.id;
		if (key in this.m_othersInfo){
			var _info = this.m_othersInfo[key];
			clearTimeout(_info.timer);
			delete this.m_othersInfo[key];
			this.redrawOthers();
		}
	},

	deleteObjects:function(objectIds){
		var deleted = false;
		var deletedOthersCanvasObject = false;
		for(var i=0;i<objectIds.length;i++){
			var objectId = objectIds[i];
			for (var j=this.m_bgObjects.length-1;j>=0;j--){
				if(objectId == this.m_bgObjects[j].id){
					this.m_bgObjects.splice(j,1);
					deleted = true;
					break;
				}
			}
			
			var key = "key" + objectId;
			if (key in this.m_othersInfo){
				var _info = this.m_othersInfo[key];
				clearTimeout(_info.timer);
				delete this.m_othersInfo[key];
				deletedOthersCanvasObject = true;
			}
		}
		if (deleted){
			this.redrawBG();
		}
		if (deletedOthersCanvasObject){
			this.redrawOthers();
		}
	},

	addText:function(text, xPx, yPx){
		var obj = new DrawingObject();
		obj.initForText(this.m_instanceId,
						this.m_myName,
						text,
						this.m_color,
						this._myRound(xPx / this.m_width),
						this._myRound(yPx / this.m_height));
		this.addObject(obj);
		this.draw(obj, this.m_bgContext);
//		this.drawMap(obj);

		return obj;
	},

	addOthersObject:function(obj){
		var _this = this;
		
		var key = "key" + obj.id;

		if (key in this.m_othersInfo){
			var _info = this.m_othersInfo[key];
			clearTimeout(_info.timer);
			delete this.m_othersInfo[key];
		}
		
		var info = {
			obj:obj,
			timer:setTimeout(function(){
				if (key in _this.m_othersInfo){
					delete _this.m_othersInfo[key];
				}
				_this.redrawOthers();
			},5000)
		};
		this.m_othersInfo[key] = info;
		this.redrawOthers();
	},

	clearOthersObject:function(){
		for(var key in this.m_othersInfo){
			var info = this.m_othersInfo[key];
			clearTimeout(_info.timer);
		}
		this.m_othersInfo = {};
		this.m_othersContext.clearRect(0, 0, this.m_width, this.m_height);
	},
	
	redrawOthers:function(){
		var _this = this;
		var now = (new Date()).getTime();
		var delta = now - this.m_lastOthersDrawTime;
		if (delta > 20){
			this._redrawOthersCore();
			this.m_lastOthersDrawTime = now;
			this.m_redrawOthersTimer = null;
			return;
		}
		
		if (this.m_redrawOthersTimer){
			clearTimeout(this.m_redrawOthersTimer);
			this.m_redrawOthersTimer = null;
		}
		this.m_redrawOthersTimer = setTimeout(function(){
			_this.redrawOthers();
		},25);
	},

	_redrawOthersCore:function(){
		
		this.m_othersContext.clearRect(0, 0, this.m_width, this.m_height);
		for(var key in this.m_othersInfo){
			var info = this.m_othersInfo[key];
			this.draw(info.obj, this.m_othersContext);
		}
	},
	
	onMouseDown:function(e){
		e.stopPropagation();
		e.preventDefault();
		if (CanvasManagerMode.SELECT == this.m_mode){

		}else{
			if (!this.m_isDragging){
				this.m_isDragging = true;
	
				var offset = this.m_elm.offset();
				this.m_mouseX = e.clientX - offset.left;
				this.m_mouseY = e.clientY - offset.top;
				this.onStartDragging();
			}
		}
	},
	onMouseUp:function(e){
		e.stopPropagation();
		if (CanvasManagerMode.SELECT == this.m_mode){

		}else{
			if (this.m_isDragging){
				this.m_isDragging = false;
				this.onStopDragging();
			}
		}
	},
	onMouseOut:function(e){
		e.stopPropagation();
		if (CanvasManagerMode.SELECT == this.m_mode){

		}else{
			if (this.m_isDragging){
				this.m_isDragging = false;
				this.onStopDragging();
			}
		}
	},
	onMouseMove:function(e){
		e.stopPropagation();
		e.preventDefault();

		if (CanvasManagerMode.SELECT == this.m_mode){
			if (!this.m_mapContext){
				return;
			}
			if (this.m_isDragging){
				this.m_context.clearRect(0, 0, this.m_width, this.m_height);
				return;
			}
			var data = this.m_mapContext.getImageData(e.clientX, e.clientY, 1, 1).data;
			if (0 == data[0] && 0 == data[1] && 0 == data[2]){
				this.m_context.clearRect(0, 0, this.m_width, this.m_height);
				return;
			}
			var randomId = data[0] << 16 | data[1] << 8 | data[2];
			var targetObj = null;

			for (var i=0;i<this.m_bgObjects.length;i++){
				if (this.m_bgObjects[i].randomId == randomId){
					targetObj = this.m_bgObjects[i];
					break;
				}
			}
			if (!targetObj){
				this.m_context.clearRect(0, 0, this.m_width, this.m_height);
				return;
			}
			this.drawSelection(targetObj);

		}else{
			if (!this.m_isDragging){
				return;
			}
			
			var offset = this.m_elm.offset();
			this.m_mouseX = e.clientX - offset.left;
			this.m_mouseY = e.clientY - offset.top;
			this.onDrag(e);
		}
		
	},

	m_msPointerId:0,
	
	onMSPointerDown:function(e){
		e.stopPropagation();
		e.preventDefault();

		if (!this.m_isDragging){
			this.m_isDragging = true;
			this.m_msPointerId = e.pointerId;

			var offset = this.m_elm.offset();
			this.m_mouseX = e.clientX - offset.left;
			this.m_mouseY = e.clientY - offset.top;
			this.onStartDragging();
		}
	},

	onMSPointerUp:function(e){
		e.stopPropagation();
		
		if (this.m_isDragging
			&& this.m_msPointerId == e.pointerId){
			this.m_isDragging = false;
			this.m_msPointerId = 0;
			this.onStopDragging();
		}
	},

	onMSPointerOut:function(e){
		e.stopPropagation();

		if (this.m_isDragging
			&& this.m_msPointerId == e.pointerId){
			this.m_isDragging = false;
			this.m_msPointerId = 0;
			this.onStopDragging();
		}
	},

	onMSPointerMove:function(e){
		e.stopPropagation();
		e.preventDefault();

		if (!this.m_isDragging
			|| this.m_msPointerId != e.pointerId){
			return;
		}
			
		var offset = this.m_elm.offset();
		this.m_mouseX = e.clientX - offset.left;
		this.m_mouseY = e.clientY - offset.top;
		this.onDrag(e);
	},

	onTouchStart:function(e){
		event.preventDefault();
		var touches = event.touches;
		if (1 != touches.length){
			return;
		}

		if (!this.m_isDragging){
			this.m_isDragging = true;

			var offset = this.m_elm.offset();
			this.m_mouseX = touches[0].pageX - offset.left;
			this.m_mouseY = touches[0].pageY - offset.top;
			this.onStartDragging();
		}
	},

	onTouchMove:function(e){
		event.preventDefault();

		var touches = event.touches;
		if (1 != touches.length){
			return;
		}
		var offset = this.m_elm.offset();
		this.m_mouseX = touches[0].pageX -offset.left;
		this.m_mouseY = touches[0].pageY - offset.top;
		
		var _this = this;
		setTimeout(function(){
			_this.onDrag(e);
		},1);
	},

	onTouchEnd:function(e){
		e.preventDefault();
		var touches = event.touches;
		if (0 != touches.length){
			return;
		}
		if (this.m_isDragging){
			this.m_isDragging = false;
			this.onStopDragging();
		}
	},

	
	onStartDragging:function(){
		this.m_currentObj = new DrawingObject();
		if (CanvasManagerMode.DRAWRECT == this.m_mode){
			this.m_currentObj.initForRect(this.m_instanceId, this.m_myName, this.m_color, this.m_lineWidth);
		}else if (CanvasManagerMode.DRAWCIRCLE == this.m_mode){
			this.m_currentObj.initForCircle(this.m_instanceId, this.m_myName, this.m_color, this.m_lineWidth);
		}else{
			this.m_currentObj.initForLine(this.m_instanceId, this.m_myName, this.m_color, this.m_lineWidth);
		}
		this.addCurrentPoint();
	},

	onStopDragging:function(){
		this.m_bgContext.drawImage(this.m_elm[0], 0,0);
		this.m_context.clearRect(0, 0, this.m_width, this.m_height);
		this.m_currentObj.smooth(this.m_step);
		if (!this.m_currentObj.hasLength()){
			return;
		}
		this.drawMap(this.m_currentObj);
		
		this.m_bgObjects.push(this.m_currentObj);
		this.m_elm.trigger("objectAdded", this.m_currentObj);
		this.m_currentObj = null;
	},

	onDrag:function(e){
		
		if (CanvasManagerMode.DRAWRECT == this.m_mode){
			if (e && e.shiftKey
				&& this.m_currentObj
				&& 0 < this.m_currentObj.points.length){
				
				var first = this.m_currentObj.points[0];
				var now = {	x: this.m_mouseX / this.m_width,
							y: this.m_mouseY / this.m_height};
				var dX = Math.abs(first.x - now.x);
				var dY = Math.abs(first.y - now.y);
				var dMax = Math.max(dX, dY);
				
				this.m_currentObj.addLastPoint(
					this._myRound(first.x < now.x ? (first.x + dMax) : (first.x - dMax)),
					this._myRound(first.y < now.y ? (first.y + dMax) : (first.y - dMax))
					);
					
			}else{
				this.m_currentObj.addLastPoint(
						this._myRound(this.m_mouseX / this.m_width),
						this._myRound(this.m_mouseY / this.m_height)
						);
			}

		} else if (CanvasManagerMode.DRAWCIRCLE == this.m_mode){
			if (e && e.shiftKey
				&& this.m_currentObj
				&& 0 < this.m_currentObj.points.length){
				var center = this.m_currentObj.points[0];
				var now = {	x: this.m_mouseX / this.m_width,
							y: this.m_mouseY / this.m_height};
				var dX = Math.abs(center.x - now.x);
				var dY = Math.abs(center.y - now.y);
				var dMax = Math.max(dX, dY);
				
				this.m_currentObj.addLastPoint(
					this._myRound(center.x + dMax),
					this._myRound(center.y + dMax)
					);
			}else{
				this.m_currentObj.addLastPoint(
						this._myRound(this.m_mouseX / this.m_width),
						this._myRound(this.m_mouseY / this.m_height)
						);
			}
		}else{
			if (e && e.altKey
				&& this.m_currentObj
				&& 0 < this.m_currentObj.points.length){
				var step = this.CTRL_DRAG_ANGLE_STEP;
				
				var first = this.m_currentObj.points[0];
				var now = {	x: this.m_mouseX / this.m_width,
							y: this.m_mouseY / this.m_height};
				var r = Math.sqrt((now.x - first.x) * (now.x - first.x)
								  + (now.y - first.y) * (now.y - first.y));
				var tan = (now.y - first.y) / (now.x - first.x);
				var w = Math.atan(tan);
				if (now.x < first.x){
					w += Math.PI;
				}else if (now.x > first.x
						  && now.y < first.y){
					w += Math.PI * 2;
				}
				w = w / Math.PI / 2 * 360;
				w /= step;
				w = Math.round(w);
				w *= step;
				if (w == 360){
					w = 0;
				}
				w = w / 360 * Math.PI * 2;
				var newX = Math.cos(w) * r + first.x;
				var newY = Math.sin(w) * r + first.y;
				
				this.m_currentObj.addLastPoint(
					this._myRound(newX),
					this._myRound(newY)
					);
			} else if (e && e.shiftKey){
				this.m_currentObj.addLastPoint(
					this._myRound(this.m_mouseX / this.m_width),
					this._myRound(this.m_mouseY / this.m_height)
					);
			} else{
				this.addCurrentPoint();
			}
		}
		this.m_context.clearRect(0, 0, this.m_width, this.m_height);
		this.draw(this.m_currentObj, this.m_context);

		this.m_elm.trigger("objectDrawing", this.m_currentObj);
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

	draw:function(obj, ctx){
		if (!this.m_drawer){
			this.m_drawer = new CanvasDrawer();
			this.m_drawer.init(this.BASE_SIZE, this.m_step);
		}

		this.m_drawer.draw(obj, ctx);
	},

	drawMap:function(obj){
		if (!this.m_mapContext){
			return;
		}
		
		if (!this.m_mapDrawer){
			this.m_mapDrawer = new CanvasDrawer();
			this.m_mapDrawer.init(this.BASE_SIZE, this.m_step);
			this.m_mapDrawer.isMapMode = true;
		}
		this.m_mapDrawer.draw(obj, this.m_mapContext);
	},

	drawSelection:function(obj){
		if (!this.m_selectionDrawer){
			this.m_selectionDrawer = new CanvasDrawer();
			this.m_selectionDrawer.init(this.BASE_SIZE, this.m_step);
			this.m_selectionDrawer.isSelectionMode = true;
		}
		this.m_selectionDrawer.draw(obj, this.m_context);
		this.draw(obj, this.m_context);
	},
	
	dummy:null
};
