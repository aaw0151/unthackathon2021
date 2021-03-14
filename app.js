//Constants
const http = require('http');
const fs = require('fs');
const mysql = require('mysql');
const url = require('url');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var formidable = require('express-formidable')
var multer = require('multer');
var upload = multer();
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(bodyParser.json());
app.use(bodyParser.raw());
app.use(formidable());
app.use(upload.array());
app.use(express.static('public'));
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
	//for favicon
	function ignoreFavicon(request, response, next) {
		if (req.originalUrl.includes('favicon.ico')) {
			response.status(204).end()
		}
		next();
	}
	app.use(ignoreFavicon);

	//query parameters
	var query = url.parse(req.url, true);
	var htmlFile = "./index.html";
	if(query.pathname != "/") {
		htmlFile = "." + query.pathname + ".html";
	}

	//file system
	fs.readFile(htmlFile, function(err, data) { //load HTML file
		if(err) {
			res.writeHead(404, {'Content-Type': 'text/html'});
			return res.end("404 Page Not Found");
		}
		if(htmlFile == "./index.html") //homepage
		{
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.write(data); //writing index.html

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
		else if(htmlFile == "./submit.html") //submit location
		{
			var queryData = query.query;
			//validating form submission
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
						if(err) { //invalid query
							res.writeHead(400, {'Content-Type': 'text/html'});
							return res.end("400 Invalid Form Submission");
						}
						console.log(sqlquery);
						res.writeHead(200, {'Content-Type': 'text/html'});
						res.write("<h2 class='thankyou'>Thank you for your submission!</h2>");
						res.write("<form method='GET' action='./'><button type='submit'>Return to Homepage</button></form>");
						res.end();
					});
				}
			}
			else
			{
				res.write(data);
			}
		}
		else if(htmlFile == "./items.html") //items list page
		{
			res.writeHead(200, {'Content-Type': 'text/html'});
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

					res.write("<div class='location_food'><h3 class='results'><strong>Name:</strong> " + result[i].name);         //location data
					res.write("<strong>  Location:</strong> " + result[i].address);                        //
					res.write("<strong>  Food Needed:</strong> " + result[i].food + "</h3></div>");                        //
				}
				res.write("</div>")
				res.end();
			});
		}
		else if(htmlFile == "./login.html") //login page
		{
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.write(data);
			var queryData = query.query;
			if(("login_failed" in queryData)) //checking if previous login failed
			{
				res.write("<h3 style='color: red'>Invalid username or password.</h3>");
			}
			res.end();
		}
		else if(htmlFile == "./send-login.html")
		{
			var queryData = query.query;
			if(!("email" in queryData) || !("pass" in queryData)) //checking if email and password are in GET request
			{
				res.writeHead(400, {'Content-Type': 'text/html'});
				return res.end("400 Invalid Login Submission");
			}
			mysqlcon.query("SELECT email, password FROM users", function(err, result, fields) { //query mysql database for all emails and passwords
				if(err) {
					res.writeHead(400, {'Content-Type': 'text/html'});
					return res.end("400 Invalid Login Submission");
				}
				result = JSON.stringify(result); //converting object to string
				result = JSON.parse(result); //converting string to array of objects
				var accountFound = false;
				for(let i = 0; i < result.length; i++) //checking if account exists
				{
					if((result[i].email === queryData.email) && (result[i].password === queryData.pass)) {
						accountFound = true;
						break;
					}
				}
				if(accountFound)
				{
					res.writeHead(200, {'Content-Type': 'text/html'});
					res.write("<h2>Logged in!</h2>");
				}
				else //if account wasn't found, redirect back to login page with flag
				{
					res.writeHead(301, {Location: 'http://localhost:8000/login?login_failed=true'});
				}
				res.end();
			});
		}
		else if(htmlFile == "./aboutus.html") //about us page
		{
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.write(data);
			res.end();
		}
		else if(htmlFile == "./sign-up.html") //signup page
		{
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.write(data);
			res.end();
		}
		else if(htmlFile == "./send-sign-up.html") //submit
		{
			var queryData = query.query;
			if(Object.keys(queryData).length != 0) //if there has not been a submission yet
			{
				var sqlquery = `INSERT INTO users (first_name, last_name, email, password) VALUES ('${queryData.fname}', '${queryData.lname}', '${queryData.email}', '${queryData.pass}')`; //insert into sql database
				if(!("fname" in queryData) || !("lname" in queryData) || !("email" in queryData) || !("pass" in queryData) || !("pass2" in queryData)) //error in submission
				{
					res.writeHead(400, {'Content-Type': 'text/html'});
					return res.end("400 Invalid Form Submission");
				}
				else
				{
					mysqlcon.query(sqlquery, function(err, result) { //query database
						if(err) {
							res.writeHead(400, {'Content-Type': 'text/html'}); //invalid query
							return res.end("400 Invalid Form Submission");
						}
						console.log(sqlquery);
						res.writeHead(301, {Location: 'http://localhost:8000/'}); //redirect to homepage
						res.end();
					});
				}
			}
		}
		else //other nonexistant pages
		{
			res.end();
		}
	});
});

//Listen for start of server
server.listen(port, hostname, () => {
	console.log(`Server running on http://${hostname}:${port}/`);
});
