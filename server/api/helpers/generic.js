
const nodemailer = require('nodemailer');
//create reusable transporter object using the default SMTP transport
//note : We are usint hte ethereal email servie which fake emails for this demo you can repalce the details with amazons ses, send grid or whatever your preference is.
let transporter = nodemailer.createTransport({
    host: process.env.emailsmtp,
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.emailusername, // generated ethereal user
        pass: process.env.emailpassword // generated ethereal password
    }
});

// setup email data with unicode symbols
let mailOptions = {
    from: '"Fred Foo 👻" <foo@example.com>', // sender address
    to: 'bar@example.com, baz@example.com', // list of receivers
    subject: 'Hello ✔', // Subject line
    text: 'Hello world?', // plain text body
    html: '<b>Hello world?</b>' // html body
};

var Generic = function ()
{
	this.test = function test() {
		console.log('yay')
	}

	/*
	*
	*	This function sends an email. 
	*
	*/
	this.sendMail = function sendMail() {
         // send mail with defined transport object
	    transporter.sendMail(mailOptions, (error, info) => {
	        if (error) {
	            return console.log(error);
	        }
	        console.log('Message sent: %s', info.messageId);
	        // Preview only available when sending through an Ethereal account
	        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

	        // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
	        // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
	    });
    };

	/*
	*
	*	This function sets the origin headers i have just allowed everything you can set your corrs policy however you want.
	*
	*/
	this.setHeaders = function setHeaders(res) {
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.setHeader(
		"Access-Control-Allow-Methods",
		"GET, POST, OPTIONS, PUT, PATCH, DELETE"
		); // If needed
		res.setHeader(
		"Access-Control-Allow-Headers",
		"X-Requested-With,content-type"
		); // If needed
		res.setHeader("Access-Control-Allow-Credentials", true); // If needed
		return res;
	}
}
exports.Generic = Generic;
