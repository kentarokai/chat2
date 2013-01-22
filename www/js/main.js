/*
 * Chat2
 * Copyright 2013, Kentaro Kai
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
*/

/*このファイルはUTF8nで保存されています*/
var g_mgr = null;

$(function(){

	var default_theme = "modern";
	
	if (window.navigator.msPointerEnabled){
		$("body").addClass("mspointer");
	}else{
		if(!!('ontouchstart' in window)){
			$("body").addClass("touch");
		}
		if(!!('onmousedown' in window)){
			$("body").addClass("mouse");
		}
	}

	if(navigator.userAgent.match(/iPhone/i)){
		$("body").addClass("iphone");
	}
	if(navigator.userAgent.match(/iPad/i)){
		$("body").addClass("ipad");
	}

	if (!$("body").hasClass("iphone")){
		$("body").addClass(default_theme);
	}
	
	if (location.search){
		var q = "" + location.search;
		dbg(q);
		if (q.match(/theme=([a-z]+)/)){
			var cl = RegExp.$1;
			if ($("body").hasClass(default_theme)){
				$("body").removeClass(default_theme);
			}
			$("body").addClass(cl);
		}
	}

	g_mgr = new ChatManager();
	g_mgr.init();
});

function dbg(o){
	window.console && window.console.log && window.console.log(o);
}





