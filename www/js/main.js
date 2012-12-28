var g_mgr = null;

$(function(){
	g_mgr = new ChatManager();
	g_mgr.init();
});

function dbg(o){
	('console' in window) && console.log(o);
}





