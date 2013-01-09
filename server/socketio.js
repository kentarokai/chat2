var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')

app.listen(3000);

function handler (req, res) {
  fs.readFile(__dirname + '/../www/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}

io.set('transports', ['websocket']);
io.sockets.on('connection', function (socket) {

	socket.on('all', function(data){
		io.sockets.emit('msg', data);
	});

	socket.on('others', function(data){
		socket.broadcast.emit('msg', data);
	});

	socket.emit('msg', {
		from: 'ChatServer',
		instanceId: 0,
		data: 'Hello',
		type: 'Message'
	});
});

console.log("#### SocketIO Server Started ####");
