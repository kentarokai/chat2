function DrawingObject(){}
DrawingObject.prototype = {

	color:"rgba(255,0,255,1)",
	lineWidth:2,
	points:[],
	id:0,
	smoothed:false,
	
	init:function(instanceId, serial, color, lineWidth){
		this.color = color;
		this.lineWidth = lineWidth;
		this.points = [];
		this.id = instanceId + "-" + serial;
		this.smoothed = false;
	},

	initWithJSONString:function(str){
		if (!('JSON' in window)){
			return;
		}
		var obj = JSON.parse(str);
		this.id = obj.id;
		this.color = obj.color;
		this.lineWidth = obj.lineWidth;
		this.points = obj.points;
		this.smoothed = true;
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

	isLine:function(){
		
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
	
	toJSONString:function(){
		var obj = {
			id : this.id,
			lineWidth: this.lineWidth,
			color : this.color,
			points : this.points
		}
		if ('JSON' in window){
			return JSON.stringify(obj);
		}
		return "";
	},

	
	dummy:null
}
