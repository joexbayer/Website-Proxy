var app = require('express')();
var express = require('express');
var server = require('http').Server(app);
var io = require('socket.io')(server);
var iconv  = require('iconv-lite');

var total_users = 0;

var socketlist = [];
//[socket, ["nrk.no", "google.com"], id, online]

const request = require('request');
app.use(express.static(__dirname+'/public'));

console.log('[SERVER] - Started');
app.get('/*', function(req, res) {
	res.header('Access-Control-Allow-Origin', '*');
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
		updateTable(data, socket);
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
    		socketlist[find][0].emit('get-cache', [data[0], findSocket(socket)]);
    		console.log("Cache found for "+ data);
    		return;
    	}
	  	var requestOptions  = { encoding: null, method: "GET", uri: data[0]};
		request(requestOptions, function (error, response, body) {
			console.log("Request sent to "+data);
			if(body != null){
				var utf8String = iconv.decode(new Buffer(body), "ISO-8859-1");
				socketlist[findID(data[1])][1].push(data[0]);
				socket.emit('html-data', [utf8String, data]);
			}
			console.log('statusCode:', response && response.statusCode);
		});
	});
	socket.on('cache-reponse', function(data){
		var soc = socketlist[data[1]][0];
		soc.emit('html-data', [data[0], null]);
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
	console.log(socketlist.length);
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
