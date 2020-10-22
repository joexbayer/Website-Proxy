var app = require('express')();
var express = require('express');
var server = require('http').Server(app);
var io = require('socket.io')(server);
var iconv  = require('iconv-lite');
var crypto = require('crypto');

var key = "123456789ABCDEF";
var tet = Math.random().toString(36).substr(2, 3) + "-" + Math.random().toString(36).substr(2, 3) + "-" + Math.random().toString(36).substr(2, 4);

console.log("Session HMAC key: "+key);

var total_users = 0;
var socketlist = [];
var request_log = [];
//[socket, ["nrk.no", "google.com"], id, online]

const request = require('request');
app.use(express.static(__dirname+'/public'));

console.log('[SERVER] - Started');
app.get('/*', function(req, res) {
	res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', function(socket) {
	socket.on('identify', function(data){
		if(data == 0 || parseInt(data) > total_users){
			total_users++;
			socketlist.push([socket, [], total_users.toString(), true]);
			socket.emit("id", total_users.toString());
			return;
		}
		updateTable (data, socket);
	});
	socket.on('disconnect', function(data){
		var i = findSocket(socket);
		if(socketlist[i] != undefined){
			socketlist[i][3] = false;
		}
	});
    socket.on('link', function(data){
    	var find = lookupTable(data[0]);
    	if(find != null){
    		var soc_id = findSocket(socket)
    		socketlist[find][0].emit('get-cache', [data[0], soc_id]);
    		request_log.push(soc_id);
    		console.log("Cache found for "+ data);
    		return;
    	}
	  	var requestOptions  = { 
	  		encoding: null, 
	  		method: "GET", 
	  		uri: data[0], 
	  		headers: {
      			'Accept-Language': 'en;q=0.8, en-GB;q=0.7'
   		 	}};
		request(requestOptions, function (error, response, body) {
			console.log("Request sent to "+data);
			if(body != null){
				var utf8String = iconv.decode(new Buffer(body), "ISO-8859-1");
				socketlist[findID(data[1])][1].push(data[0]);
				var hmac = crypto.createHmac('sha1', key).update(utf8String).digest('hex');
				socket.emit('html-data', [utf8String, data, hmac]);
			} else {
				console.log(error);
			}
			console.log('statusCode:', response && response.statusCode);
		});
	});
	socket.on('cache-reponse', function(data){
		if(request_log.includes(data[1])){
			var soc = socketlist[data[1]][0];
			var hmac = crypto.createHmac('sha1', key).update(data[0]).digest('hex');
			console.log(hmac == data[2]);
			if(hmac == data[2]){
				soc.emit('html-data', [data[0], null]);
			}
			request_log.splice(request_log.indexOf(data[1]), 0);
		}
	});
});

function findSocket(soc){
	for (var i = socketlist.length - 1; i >= 0; i--) {
		if(socketlist[i][0] == soc){
			return i;
		}
	}
}

function findID(id){
	for (var i = socketlist.length - 1; i >= 0; i--) {
		if(socketlist[i][2] == id){
			return i;
		}
	}
}

function updateTable(data, socket){
	for (var i = socketlist.length - 1; i >= 0; i--) {
		if(socketlist[i][2] == data){
			socketlist[i][0] = socket;
			socketlist[i][3] = true; 
			return;
		}
	}
}

function lookupTable(link){
	for (var i = socketlist.length - 1; i >= 0; i--) {
		for (var j = socketlist[i][1].length - 1; j >= 0; j--) {
			if(socketlist[i][1].includes(link) && socketlist[i][3]){
				return i;
			}
		}
	}
	return null;
}

server.listen(5000);
