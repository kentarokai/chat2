/*
 * Chat2
 * Copyright 2013, Kentaro Kai
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
*/

/*このファイルはUTF8nで保存されています*/

function CanvasDrawer(){}
CanvasDrawer.prototype = {

	CIRCLE_BEZIER_CONST:0.5522847,
	MAPMODE_ADDITIONAL_LINEWIDTH:8,
	m_width:0,
	m_height:0,
	m_widthBaseSize:0,
	m_step:0,
	isMapMode:false,
	isSelectionMode:false,
	
	init:function(widthBaseSize, lineStep){
		this.m_widthBaseSize = widthBaseSize;
		this.m_step = lineStep;
	},

	_pc2px:function(pc){
		return {
			x: pc.x * this.m_width,
			y: pc.y * this.m_height
		};
	},

	_getObjLineWidth:function(obj){
		var w = obj.lineWidth * this.m_height / this.m_widthBaseSize;
		if (this.isMapMode){
			w += this.MAPMODE_ADDITIONAL_LINEWIDTH;
		}
		return w;
	},

	draw:function(obj, ctx){
		//ctx.webkitImageSmoothingEnabled = false;
		var canvas = ctx.canvas;
		
		this.m_width = canvas.width;
		this.m_height = canvas.height;

		if (this.isSelectionMode){
			ctx.clearRect(0, 0, this.m_width, this.m_height);
		}

		var color = "";
		if (this.isSelectionMode){
			color = "gray";
		}else if (this.isMapMode){
			color = "#" + ("000000" + obj.randomId.toString(16)).slice(-6);
		}else{
			color =  obj.color;
		}

		var lineWidth = obj.lineWidth * this.m_height / this.m_widthBaseSize;
		if (this.isSelectionMode){
			lineWidth += 8;
		}else if (this.isMapMode){
			lineWidth += this.MAPMODE_ADDITIONAL_LINEWIDTH;
		}
		
		this._drawCore(obj, ctx, color, lineWidth);

		if (!this.isSelectionMode){
			return;
		}

		color = "white";
		lineWidth = obj.lineWidth * this.m_height / this.m_widthBaseSize;
		lineWidth += 4;

		this._drawCore(obj, ctx, color, lineWidth);
	},

	_drawCore:function(obj, ctx, color, lineWidth){
		if (DrawingObjectType.LINE == obj.type){
			this.drawLine(obj, ctx, color, lineWidth);
		}else if (DrawingObjectType.TEXT == obj.type){
			this.drawText(obj, ctx, color);
		}else if (DrawingObjectType.CIRCLE == obj.type){
			this.drawCircle(obj, ctx, color, lineWidth);
		}else if (DrawingObjectType.RECT == obj.type){
			this.drawRect(obj, ctx, color, lineWidth);
		}
	},

	drawText:function(obj, ctx, color){
		if (!obj.points.length){
			return;
		}
		var first = obj.points[0];
		var pos = this._pc2px(first);
		var fontsize = 14 * this.m_height / this.m_widthBaseSize;
		ctx.fillStyle = color;
		ctx.font = fontsize + "px sans-serif";
		ctx.fillText(obj.text, pos.x, pos.y);  
	},
	
	drawLine:function(obj, ctx, color, lineWidth){
		
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
//			mX = (point.x + lastPoint.x) / 2.0;
//			mY = (point.y + lastPoint.y) / 2.0;
//		    ctx.lineTo(mX, mY);
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

		ctx.lineWidth = lineWidth;
		ctx.strokeStyle = color;
		ctx.lineCap = "round";
		ctx.stroke();
	},

	drawCircle:function(obj, ctx, color, lineWidth){
		if (!obj.points.length){
			return;
		}
		ctx.beginPath();

		var pc1 = obj.points[0];
		var pos1 = this._pc2px(pc1);
		var pc2 = obj.points[obj.points.length-1];
		var pos2 = this._pc2px(pc2);
		
		var rx = Math.abs(pos1.x - pos2.x);
		var ry = Math.abs(pos1.y - pos2.y);
		var cx = pos1.x;
		var cy = pos1.y;
		ctx.moveTo(cx+rx, cy);
		ctx.bezierCurveTo(cx+rx,	cy-ry*this.CIRCLE_BEZIER_CONST,
						  cx+rx*this.CIRCLE_BEZIER_CONST,	cy-ry,
						  cx,	cy-ry);
		ctx.bezierCurveTo(cx-rx*this.CIRCLE_BEZIER_CONST,	cy-ry,
						  cx-rx,	cy-ry*this.CIRCLE_BEZIER_CONST,
						  cx-rx,	cy);
		ctx.bezierCurveTo(cx-rx,	cy+ry*this.CIRCLE_BEZIER_CONST,
						  cx-rx*this.CIRCLE_BEZIER_CONST,	cy+ry,
						  cx,	cy+ry);
		ctx.bezierCurveTo(cx+rx*this.CIRCLE_BEZIER_CONST,	cy+ry,
						  cx+rx,	cy+ry*this.CIRCLE_BEZIER_CONST,
						  cx+rx,	cy);

		ctx.lineWidth = lineWidth;
		ctx.strokeStyle = color;
		ctx.lineCap = "round";
		ctx.stroke();
	},

	drawRect:function(obj, ctx, color, lineWidth){
		if (!obj.points.length){
			return;
		}
		ctx.beginPath();

		var pc1 = obj.points[0];
		var pos1 = this._pc2px(pc1);
		var pc2 = obj.points[obj.points.length-1];
		var pos2 = this._pc2px(pc2);

		var x = Math.min(pos1.x, pos2.x);
		var w = Math.abs(pos1.x - pos2.x);
		var y = Math.min(pos1.y, pos2.y);
		var h = Math.abs(pos1.y - pos2.y);

		ctx.rect(x, y, w, h);
		
		ctx.lineWidth = lineWidth;
		ctx.strokeStyle = color;
		ctx.lineCap = "round";
		ctx.stroke();
	},
	
	dummy:null
};
