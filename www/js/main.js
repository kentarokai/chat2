/*
 * Chat2
 * Copyright 2013, Kentaro Kai
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
*/

/*このファイルはUTF8nで保存されています*/
var g_mgr = null;

$(function(){
	
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

	g_mgr = new ChatManager();
	g_mgr.init();
});

function dbg(o){
	window.console && window.console.log && window.console.log(o);
}





