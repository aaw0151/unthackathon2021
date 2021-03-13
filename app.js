//Constants
var http = require('http');
var fs = require('fs');
var mysql = require('mysql');
var url = require('url');
const hostname = "127.0.0.1";
const port = 8000;

//mysql Information
var mysqlcon = mysql.createConnection({
	host: "localhost",
	user: "root",
	password: "",
	database: "mydb"
});
mysqlcon.connect(function(err){
	if(err) throw err;
	console.log("mySQL Database Connected");
});

//Main server
const server = http.createServer(function (req, res) {
	var query = url.parse(req.url, true);
	var htmlFile = "./index.html";
	console.log("pathname=" + query.pathname);
	if(query.pathname != "/") {
		htmlFile = "." + query.pathname + ".html";
	}
	fs.readFile(htmlFile, function(err, data) {
		console.log("html=" + htmlFile);
		if(err) {
			res.writeHead(404, {'Content-Type': 'text/html'});
			return res.end("404 Page Not Found");
		}
		if(htmlFile == "./index.html")
		{
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.write(data); //writing index.html
			console.log("htmlFile=" + htmlFile);

			//Querying mysql Database
			mysqlcon.query("SELECT * FROM locations", function(err, result, fields) { 
				if(err) throw err;
				result = JSON.stringify(result); //converting object to string
				result = JSON.parse(result); //converting string to array of objects
				res.write("<div class='location_list'>");
				for(var i = 0; i < result.length; i++) //looping through all rows in table
				{
					result[i].date = (result[i].date).slice(0, 10); //spliting up date
					let year = (result[i].date).slice(0, 4);        //
					let day = (result[i].date).slice(5, 7);         //
					let month = (result[i].date).slice(8, 10);      //

					res.write("<div class='location'><h3 class='results'><strong>Name:</strong> " + result[i].name + "</h3>");         //location data
					res.write("<h3 class='results'><strong>Location:</strong> " + result[i].address + "</h3>");                        //
					res.write("<h3 class='results'><strong>People Needed:</strong> " + result[i].numpeople + "</h3>");                 //
					res.write("<h3 class='results'><strong>Food Needed:</strong> " + result[i].food + "</h3>");                        //
					res.write("<h3 class='results'><strong>Phone Number:</strong> " + result[i].phone + "</h3>");                      //
					res.write("<h3 class='results'><strong>Date:</strong> " + month + "/" + day + "/" + year + "</h3></div><br><br>"); //
				}
				res.write("</div>")
				res.end();
			});
		}
		else if(htmlFile == "./submit.html")
		{
			var queryData = query.query;
			//validating form submission
			console.log(JSON.stringify(queryData));
			if(Object.keys(queryData).length != 0) //if there has not been a submission yet
			{
				if(!("name" in queryData) || !("address" in queryData) || !("people" in queryData) || !("food" in queryData) || !("phone" in queryData)) //error in submission
				{
					res.writeHead(400, {'Content-Type': 'text/html'});
					return res.end("400 Invalid Form Submission");
				}
				else //successful submission
				{
					var currentDate = new Date(); //get current date
					let month = currentDate.getMonth() + 1; //increase month number since it starts at 0

					//query mysql to insert new record
					var sqlquery = `INSERT INTO locations (name, address, numpeople, food, date, phone) VALUES ('${queryData.name}', '${queryData.address}', ${queryData.people}, '${queryData.food}', '${currentDate.getFullYear()}-${month}-${currentDate.getDate()}', '${queryData.phone}')`;
					mysqlcon.query(sqlquery, function(err, result) {
						if(err) {
							res.writeHead(400, {'Content-Type': 'text/html'});
							return res.end("400 Invalid Form Submission");
						}
						console.log(sqlquery);
						res.writeHead(200, {'Content-Type': 'text/html'});
						res.write("<h2 class='thankyou'>Thank you for your submission!</h2>");
						res.write("<form method='GET' action='./'><button type='submit'>Return to Homepage</button></form>")
						res.end();
					});
				}
			}
			else
			{
				res.write(data);
			}
		}
		else
		{
			res.end();
		}
	});
});

//Listen for start
server.listen(port, hostname, () => {
	console.log(`Server running on http://${hostname}:${port}/`);
});
