var http = require('http');

var server = http.createServer(function (request, response) {

  response.writeHead(200, {'Content-Type': 'text/plain'});


  response.end(request.url + ' Hello World\n');

}).listen(8124);

server.on('request', function(req, res){
   console.log(req.url + ' "' + req.headers['user-agent'] + '"');
});



console.log('Server running at http://127.0.0.1:8124/');

