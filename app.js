//Constants
var http = require('http');
var fs = require('fs');
//var mysql = require('mysql');
const hostname = "127.0.0.1";
const port = 8000;

//Main server
const server = http.createServer(function (req, res) {
	fs.readFile('index.html', function(err, data) {
		if(err) throw err;
		res.writeHead(200, {'Content-Type': 'text/html'});
		res.write(data);
		return res.end();
	});
});

//Listen for start
server.listen(port, hostname, () => {
	console.log(`Server running on http://${hostname}:${port}/`);
});
