//Constants
const http = require('http');
const fs = require('fs');
const mysql = require('mysql');
const url = require('url');
const crypto = require('crypto');
const keys = require('./config');
const google_api_key = keys.GOOGLE_MAPS_API_KEY();
const secret = keys.CRYPTO_KEY();
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
	var htmlFile = "./Home.html";
	if(query.pathname != "/") {
		htmlFile = "." + query.pathname;
	}

	//file system
	fs.readFile(htmlFile, function(err, data) { //load HTML file
		if(err) {
			res.writeHead(404, {'Content-Type': 'text/html'});
			return res.end("404 Page Not Found");
		}
		if(htmlFile == "./Home.html") ///homepage
		{
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.write(data); //writing index.html
			res.end();
		}
		else if(htmlFile == "./Food_Bank_Locator.html") //locations page
		{
			res.writeHead(200, {'Content-Type': 'text/html'});
			var queryData = query.query;
			if(!("zip" in queryData)) //if zip not included, default to Denton
				queryData['zip'] = "Denton, TX";
			var wholePage = data;
			wholePage += `<iframe id="Image_1"width="600" height="450" style="border:0" loading="lazy" allowfullscreen src="https://www.google.com/maps/embed/v1/place?key=${google_api_key}&q=${queryData.zip}"> </iframe>`; //add google maps embed api
			fs.readFile("./Food_Bank_Locator2", function(err2, data2) {
				if(err2) throw err;
				wholePage += data2;
				res.write(wholePage);
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
		else if(htmlFile == "./Items_Needed.html") //items list page
		{
			res.writeHead(200, {'Content-Type': 'text/html'});
			var wholePage = data;
			mysqlcon.query("SELECT * FROM locations", function(err, result, fields) {
				if(err) throw err;
				result = JSON.stringify(result); //converting object to string
				result = JSON.parse(result); //converting string to array of objects
				wholePage += ("<div class='Rectangle_6'><br><br><br><br><br>");
				for(var i = 0; i < result.length; i++) //looping through all rows in table
				{
					result[i].date = (result[i].date).slice(0, 10); //spliting up date
					let year = (result[i].date).slice(0, 4);        //
					let day = (result[i].date).slice(5, 7);         //
					let month = (result[i].date).slice(8, 10);      //

					wholePage += ("<div id='Location_Text'><h3 class='results'>" + result[i].name + "  "); //location data
					wholePage += (result[i].address + "  ");                                               //
					wholePage += (result[i].food + "</h3></div>");                                         //
				}
				wholePage += "</div>";
				fs.readFile("./Items_Needed2", function(err2, data2) {
					if(err2) throw err2;
					wholePage += data2;
					res.write(wholePage);
					res.end();
				});
			});
		}
		else if(htmlFile == "./Log_In.html") //login page
		{
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.write(data);
			var queryData = query.query;
			if(("login_failed" in queryData)) //checking if previous login failed
			{
				res.write("<h3 id='ErrorMessage'>Invalid username or password.</h3>");
			}
			fs.readFile("./Log_In2", function(err2, data2) {
				res.write(data2);
				res.end();
			});
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
				var hmac = crypto.createHmac('sha256', secret).update(queryData.pass).digest('hex');
				queryData['pass'] = ""; //removing password from memory
				queryData['hashedpass'] = hmac;
				var accountFound = false;
				for(let i = 0; i < result.length; i++) //checking if account exists
				{
					if((result[i].email === queryData.email) && (result[i].password === queryData.hashedpass)) {
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
					res.writeHead(301, {Location: 'http://localhost:8000/Log_In.html?login_failed=true'});
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
			var hmac = crypto.createHmac('sha256', secret).update(queryData.pass).digest('hex'); //hash password
			queryData['pass'] = ""; //remove pass from memory
			queryData['hashedpass'] = hmac;
			if(Object.keys(queryData).length != 0) //if there has not been a submission yet
			{
				var sqlquery = `INSERT INTO users (first_name, last_name, email, password) VALUES ('${queryData.fname}', '${queryData.lname}', '${queryData.email}', '${queryData.hashedpass}')`; //insert into sql database
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
