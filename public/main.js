var socket;
var id = 0;
var cache = [];
if(sessionStorage.getItem("cache") != undefined){
	cache = JSON.parse(sessionStorage.getItem("cache"));
}
id = sessionStorage.getItem("id");
if(id == undefined){
	id = 0;
}
socket = io.connect('http://' + document.domain + ':' + location.port);
socket.emit('identify', id);
var input_link;
var link = window.location.href.toString();
var xmlHttp = new XMLHttpRequest();



window.onload = (event) => {
  	if(window.location.href.toString() != 'http://' + document.domain + ':' + location.port+'/'){
  		var link = window.location.href.toString();
  		var new_link = link.replace('http://' + document.domain + ':' + location.port, "");
		input_link = document.cookie;
		var res = input_link.split("=");
		socket.emit('link', [res[1].split(";")[0]+new_link, id]);
	}
};

document.onclick = function (e) {
 	e = e ||  window.event;
 	var element = e.target || e.srcElement;

  	if (element.tagName == 'A') {
    	redirect(element.href);
    	return false; // prevent default action
  	}
};

function redirect(e){
	var link = e.toString();
	if(!link.includes(document.domain)){
		var temp_link = "";
		var res = link.split("/");
		input_link = document.cookie;
		var res2 = input_link.split("=");
		document.cookie = "site="+res2[1]+"; expires=Thu, 18 Dec 2013 12:00:00 UTC";
		if(res[0] != "https:"){
			document.cookie = "site="+"https://www."+link+"; path=/";
			temp_link = "https://www."+link+"/"+res;
		} else {
			temp_link = res[0]+"//www."+res[2]+"/";
			document.cookie = "site="+temp_link+"; path=/";
		}
		socket.emit('link', [temp_link, id]);
	} else {
		window.location.href = link;
	}
}

window.onbeforeunload = function() {
    sessionStorage.setItem("cache", JSON.stringify(cache));
    sessionStorage.setItem("id", id);
    socket.emit('disconnect');
}

function lookupTable(url){
	for (var i = cache.length - 1; i >= 0; i--) {
		if(cache[i][0] == url){
			return i;
		} 
	}
	return null;
}

function submit() {
	input_link = document.getElementById("url").value.replaceAll("www.", "");
	var og_link = document.getElementById("url").value;
	var res = input_link.split("/");
	var cookie = document.cookie;
	var res_cookie = cookie.split("=");
	document.cookie = "site="+res_cookie[1]+"; expires=Thu, 18 Dec 2013 12:00:00 UTC";
	if(res[0] != "https:"){
		document.cookie = "site="+"https://www."+input_link+"; path=/";
		var input_link = "https://www."+input_link;
		var table = lookupTable(input_link);
		if(table != null){
			document.getElementById("frame").innerHTML = window.atob(cache[table][1]);
			return;
		}
		socket.emit('link', [input_link, id]);
	} else {
		var input_link = res[0]+"//www."+res[2];
		document.cookie = "site="+input_link+"; path=/";
		var table = lookupTable(og_link);
		if(table != null){
			document.getElementById("frame").innerHTML = window.atob(cache[table][1]);
			return;
		}
		socket.emit('link', [og_link, id]);
	}
}

socket.on("id", function(data){
	id = data;
	cache = [];
});

socket.on('get-cache', function(data){
    var table = lookupTable(data[0]);
    console.log("getting cache for "+data[0]);
    socket.emit("cache-reponse", [window.atob(cache[table][1]), data[1], cache[table][2]]);
});

socket.on('html-data', function(data){
	input_link = document.cookie;
	if(data[1] != null){
		cache.push([data[1][0], window.btoa(data[0]), data[2]]);
	}
	var res = input_link.split("=");	
	var filtered = data[0].replaceAll('src="/', 'src="'+res[1].split(";")[0]+'/');
	filtered = filtered.replaceAll('href="/', 'href="'+res[1].split(";")[0]+'/');
	filtered = filtered.replaceAll('<a href="'+res[1].split(";")[0], '<a href="http://' + document.domain + ':' + location.port);
	document.getElementById("frame").innerHTML = filtered;
});
