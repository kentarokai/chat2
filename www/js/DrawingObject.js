/*
 * Chat2
 * Copyright 2013, Kentaro Kai
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
*/

/*このファイルはUTF8nで保存されています*/
var DrawingObjectType = {
	UNKNOWN:'unknown',
	LINE:'line',
	TEXT:'text',
	CIRCLE:'circle',
	RECT:'rect',
};
var DrawingObjectSerial = 1;

function _DrawingRandomIds(){}
_DrawingRandomIds.prototype = {
	ids:[],

	init:function(){
		this.ids = [];
	},

	next:function(){
		var max = 255 << 16 | 255 << 8 | 255;
		var n = -1;
		while(n < 0){
			var _n = Math.floor(Math.random() * (max-1)) + 1;
			var dup = false;
			for(var i=0;i<this.ids.length;i++){
				if (this.ids[i] == _n){
					dup = true;
					break;
				}
			}
			if (!dup){
				n = _n;
				break;
			}
		}
		this.ids.push(n);
		return n;
	},
	
	dummy:null
};
var DrawingRandomIds = new _DrawingRandomIds();
DrawingRandomIds.init();

function DrawingObject(){}
DrawingObject.prototype = {

	owner:"",
	type:DrawingObjectType.UNKNOWN,
	color:"rgba(255,0,255,1)",
	lineWidth:2,
	points:[],
	id:"",
	instanceId:0,
	smoothed:false,
	text:"",
	randomId:-1,

	init:function(type, instanceId, owner, color, lineWidth, text){
		this.type = type;
		this.owner = owner;
		this.color = color;
		this.lineWidth = lineWidth;
		this.points = [];
		this.instanceId = instanceId;
		this.id = instanceId + "-" + (DrawingObjectSerial++);
		this.smoothed = false;
		this.text = text;
		this.randomId = DrawingRandomIds.next();
	},

	initForLine:function(instanceId,  owner, color, lineWidth){
		this.init(DrawingObjectType.LINE, instanceId, owner, color, lineWidth, "");
	},

	initForText:function(instanceId, owner, text, color, xPc, yPc){
		this.init(DrawingObjectType.TEXT, instanceId, owner, color, 1, text);
		this.addPoint(xPc, yPc);
	},

	initForCircle:function(instanceId,  owner, color, lineWidth){
		this.init(DrawingObjectType.CIRCLE, instanceId, owner, color, lineWidth, "");
	},

	initForRect:function(instanceId,  owner, color, lineWidth){
		this.init(DrawingObjectType.RECT, instanceId, owner, color, lineWidth, "");
	},

	initWithJSONString:function(str){
		this.initWithObject(JSON.parse(str));
	},

	initWithObject:function(obj){
		this.id = obj.id;
		this.instanceId = (this.id.split("-"))[0];
		this.type = obj.type;
		this.color = obj.color;
		this.lineWidth = obj.lineWidth;
		this.smoothed = obj.smoothed;
		this.text = obj.text;
		this.owner = obj.owner;
		this.randomId = DrawingRandomIds.next();

		if (obj.pointList){
			var points = [];
			for(var i=0;i<obj.pointList.length;i+=2){
				points.push({x:obj.pointList[i], y:obj.pointList[i+1]});
			}
			this.points = points;
		}else{
			this.points = obj.points;
		}
	},

	clone:function(){
		var newObj = new DrawingObject();
		newObj.initWithJSONString(this.toJSONString());
		return newObj;
	},
	
	addPoint:function(xPc, yPc){
		this.points.push({
			x: xPc,
			y: yPc
			});
	},

	addLastPoint:function(xPc, yPc){
		if (1 < this.points.length){
			this.points.splice(1, this.points.length-1);
		}
		this.addPoint(xPc, yPc);
	},
	
	smooth:function(step){
		var count = this.points.length;
		this.smoothed = true;
		if (!count){
			return;
		}
		var sPoints = [];
		sPoints.push(this.points[0]);
		if (1 < count){
			sPoints.push(this.points[1]);
		}
		for(var i=2;i<count;i+=step){
			sPoints.push(this.points[i]);
		}
		sPoints.push(this.points[count-1]);
		this.points = sPoints;
	},

	hasLength:function(){
		if (2 > this.points.length){
			return false;
		}
		var x=this.points[0].x;
		var y=this.points[0].y;
		for(var i=1;i<this.points.length;i++){
			if (x != this.points[i].x
				|| y != this.points[i].y){
				return true;
			}
		}
		return false;
	},

	toObject:function(){
		var obj = {
			id : this.id,
			type: this.type,
			owner: this.owner,
			lineWidth: this.lineWidth,
			color : this.color,
			points : this.points,
			text: this.text,
			smoothed: this.smoothed
		}
/*
		var _points = [];
		for(var i=0;i<this.points.length;i++){
			_points.push(this.points[i].x);
			_points.push(this.points[i].y);
		}
		obj.pointList = _points;
*/		
		
		return obj;
	},
	
	toJSONString:function(){
		return JSON.stringify(this.toObject());
	},

	getInstanceId:function(){
		return (this.id.split("-"))[0];
	},

	getSerial:function(){
		return (this.id.split("-"))[1];
	},
	
	dummy:null
}
