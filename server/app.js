//check the process env vars

if (process.env.emailsmtp == undefined)
  process.env.emailsmtp = 'smtp.ethereal.email';
if (process.env.emailusername == undefined)
  process.env.emailusername = 'rjf2z2dghi4bn3yv@ethereal.email';
if (process.env.emailpassword == undefined)
  process.env.emailpassword = 'NG4PPPuqvZaagwSjWV';
if (process.env.walletpassphrase == undefined)
  process.env.walletpassphrase = 'test';
if (process.env.walletaccount == undefined)
  process.env.walletaccount = 'theaccount';
if (process.env.blockiokey == undefined)
  process.env.blockiokey = '9ccb-fad0-7811-4dfb ';
if (process.env.blockiosecret == undefined)
  process.env.blockiosecret = '2N3Xtg7pBjUG4RPaiwfc2t3wftvLGWv6i2K';
console.log(process.env.walletaccount)
if (process.env.PORT == undefined)
  process.env.PORT = 8080;

//load express
const express = require("express");
//include the version package
require( 'pkginfo' )( module, 'version','name','description' );
//display a message to the console.
console.log( module.exports.name+": " + module.exports.version );
console.log( module.exports.description+' is listenting :]');

//load the generic functions
var generichelper = require('./api/helpers/generic.js').Generic;
var generic = new generichelper();
//debug
//generic.sendMail(1,'wah@gah.com');

//init it
const app = express();

/*
==============================
START OF BACKOFFICE ROUTING
=============================
*/
app.get("/backoffice/test", (req, res) => {
  //load the back office helper
  let backofficehelper = require('./api/helpers/backoffice.js').backOffice;
  let backoffice = new backofficehelper();

  //debug
  backoffice.test(req,res);
});


/*
==============================
END OF BACKOFFICE ROUTING
=============================
*/

/*
========================
START OF ADMIN FUNCTION
========================
*/

//update the settings
app.get("/admin/updatesettings", (req, res) => {
  //set the headers
  res = generic.setHeaders(res);

  //check if it is a zero and if so return error
  //todo : check for duplicate address and validate the btc adddress
  if (req.query.address == '')
  {
     res.send(JSON.stringify({ error: "no address" }));
     return;
  }
  //load the admin helper
  let adminhelper = require('./api/helpers/admin.js').admin;
  let admin = new adminhelper();
  //add the cold storage address
  admin.addColdStorageAddress(req.query.token,req.query.address,res);
});



//return the admin settings
app.get("/admin/deletesettingsaddress", (req, res) => {

  //set the headers
  res = generic.setHeaders(res);
  //check if it is a zero and if so return error
  if (req.query.address == '')
  {
     res.send(JSON.stringify({ error: "no address" }));
     return;
  }
  //load the admin helper
  let adminhelper = require('./api/helpers/admin.js').admin;
  let admin = new adminhelper();  
  admin.deleteColdStorageAddress(req.query.address,res)
  
});


//return the admin settings
app.get("/admin/settings", (req, res) => {
  //set the headers
  res = generic.setHeaders(res);
  //check if it is a zero and if so return error
  if (req.query.address == '')
  {
     res.send(JSON.stringify({ error: "no address" }));
     return;
  }
  //load the admin helper
  let adminhelper = require('./api/helpers/admin.js').admin;
  let admin = new adminhelper(); 
  //get the settings
  admin.getSettings(req.query.token,res);
});

//orders
app.get("/admin/order", (req, res) => {
  //set the headers
  res = generic.setHeaders(res);
  //check if it is a zero and if so return error
  if (req.query.address == '')
  {
     res.send(JSON.stringify({ error: "no address" }));
     return;
  }
  //load the admin helper
  let adminhelper = require('./api/helpers/admin.js').admin;
  let admin = new adminhelper(); 
  //get the products
  admin.getOrder(req.query.address,res);
});

//return a list of payments
app.get("/admin/payments", (req, res) => {
  //set the headers
  res = generic.setHeaders(res);
  //check if it is a zero and if so return error
  if (req.query.address == '')
  {
     res.send(JSON.stringify({ error: "no address" }));
     return;
  }
  //load the admin helper
  let adminhelper = require('./api/helpers/admin.js').admin;
  let admin = new adminhelper(); 
  //call the get orders function
  admin.getOrders(req.query.token,res);

});

//login the user in
app.get("/admin/login", (req, res) => {
  //set the headers
  res = generic.setHeaders(res);
  //load the admin helper
  let adminhelper = require('./api/helpers/admin.js').admin;
  let admin = new adminhelper(); 
  //call the login function
  admin.login(req.query.uname,req.query.pass,res);
});



/*
========================
END OF ADMIN FUNCTION
========================
*/

/*
========================
START OF API FUNCTIONS
========================
*/

//pass it an address and it will check if payment has been made.  See this just like monitor js does but it is not on a timer. called from admin
app.get("/api/monitor", (req, res) => {
  //set the headers
  res = generic.setHeaders(res);
  //load the api helper
  let apihelper = require('./api/helpers/api.js').api;
  let api = new apihelper(); 
  //call the login function
  api.monitor(req.query.address,res);
});

//move a payment to cold storage called from admin
//todo: We get the cold storage address from a process env but in the admin we store it a table.  We have to decide how to use the cold
//    storage address and serve it the same way in each function
app.get("/api/sweep", (req, res) => {
  //set the headers
  res = generic.setHeaders(res);
  //load the api helper
  let apihelper = require('./api/helpers/api.js').api;
  let api = new apihelper(); 
  //call the login function
  api.sweep(req.query.address,res);
});

//generate an address and output it called rom sr.js
app.get("/api/address", (req, res) => {
  //debug
  //generic.test();
    //set the headers
  res = generic.setHeaders(res);
  //load the api helper
  let apihelper = require('./api/helpers/api.js').api;
  let api = new apihelper(); 
  //call the login function
  api.generateAddress(req.query.uid,res);
});

//store user details called rom sr.js
app.get("/api/storeuserdetails", (req, res) => {
  //set the headers
  res = generic.setHeaders(res);
  //load the api helper
  let apihelper = require('./api/helpers/api.js').api;
  let api = new apihelper(); 
  //call the login function
  api.storeUserDetails(req,res);
});

//storeproduct  called rom sr.js
app.get("/api/storeproduct", (req, res) => {
  //set the headers
  res = generic.setHeaders(res);
  //load the api helper
  let apihelper = require('./api/helpers/api.js').api;
  let api = new apihelper(); 
  //call the login function
  api.storeProduct(req,res);
});

/*
========================
END OF API FUNCTIONS
========================
*/

//console.log('up and at em ')
//set port not we use an env port so that the server we deploy to can set it to whatever port it wants.
//This is common practice in AWS I am not sure if all server providers use the same method.
//note as we are passing this as process env we have to make sure this is set on the server
var port = process.env.PORT 
console.log('listenting on port:'+port)
//listen
app.listen(port);


