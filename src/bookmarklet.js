var script = document.createElement('script');
script.onload = function(){
	window.chromecastit('main');
};
script.type = "text\/javascript";
script.src = '<%= bookmarklet_endpoint %>';
document.head.appendChild(script);
