/*

This is the sweep script that moves payment to our hard wallet.


*/
//init block.io
var BlockIo = require('block_io');
var version = 2; // API version
var block_io = new BlockIo(process.env.blockiokey,process.env.blockiosecret, version);
//load express
const express = require('express');
//load body parser
const bodyParser = require('body-parser');
//load the bitcoin js files
var bitcoin = require('bitcoinjs-lib');
//load SQLlite (use any database you want or none)
//init it
const sqlite3 = require('sqlite3').verbose();
var request = require('request');

//init it
const app = express();


//open a database connection
let db = new sqlite3.Database('./db/db.db', (err) => {
  if (err) {
    console.error(err.message);
  }
});
//set up the network we would like to connect to. in this case test net.
const TestNet = bitcoin.networks.testnet

//build the query we are looking for transactions that have been processed (monitor has picked them up) but the funds have not been 
//swept to cold storage yet.
//note : I have set this to a limit of 1 as it allows me to dev faster move the limit to batch process.
let sql = `SELECT * FROM keys where processed = 1 and swept = 0 limit 0,1`;
//run the query
db.all(sql, [], (err, rows) => {
  if (err) {
    throw err;
  }
 rows.forEach((row) => {
    
    //get the address
    var address =  row.address;
    //get the private key
    var privateKey = row.privatekey;
    //debug
    //console.log(row);
    //console.log(address);
   	//console.log(privateKey);
    //get the transactions
    //note: We should only have one transaction in this address so we can make some assumpation. We would however harden this 
    //		function before it was used in any production enviorment.
    block_io.get_transactions({'type': 'received', 'addresses': address}, function (error, data)
	{
		//todo : check for no transactions
		//console.dir(data, { depth: null });
		//get the tx transaction id
		var txid = data.data.txs[0].txid;
		//get the amount in the transaction
		let amountReceived = data.data.txs[0].amounts_received[0].amount;
		//debug
		//console.log(amountReceived);
		//console.log(txid);

		//estimate the fee
		//note : We are using block.io to estimate the fee but we will of course do this ourselves later.
		block_io.get_network_fee_estimate({'amounts': amountReceived, 'to_addresses': process.env.toaddress}, function (error2, data2)
		{
			//store the network fee.
			var networkfee = data2.data.estimated_network_fee;
			//debug
			//console.log(networkfee);
			//console.log(data2.data.estimated_network_fee);

			//init a new transaction
			let tx = new bitcoin.TransactionBuilder(TestNet);
			//get the WIF from the private key so we can sign the transaction later.
			let hotKeyPair = new bitcoin.ECPair.fromWIF(privateKey, TestNet)
			//debug
			//console.log(privateKey);
			//console.log(hotKeyPair);
			//work out the amount to send 
			//let amountToSend =  amountReceivedSatoshi - networkfee   ;
			let amountToSend =  amountReceived - networkfee   ;
			//turn the amount recieved into satoshis 
			//note : Satoshi information can be found here https://en.bitcoin.it/wiki/Satoshi_(unit)
			amountToSendSatoshi = amountToSend * 100000000;
			//debug
			//console.log(amountToSendSatoshi);
			//console.log(networkfee);
			//console.log(amountToSend);
			//add the input the transaction we are building
			//note txid = we got fron the get transaction type
			//	   0 = is the first transaction to be safe we could parse data object and return the correct one 
			//	   0xfffffffe = no idea will have to read up on this
			tx.addInput(txid, 0, 0xfffffffe);
			//note : this seems to do the fee on of its own accord.
			tx.addOutput(process.env.toaddress, amountToSendSatoshi);
			//sign the transaction with our private key
			tx.sign(0, hotKeyPair);
			//output it
			//note we have to figure out how to push this to the network and not use https://testnet.blockchain.info/pushtx
			console.log(tx.build().toHex());

			// Set the headers
			var headers = {
			    'User-Agent':       'Super Agent/0.0.1',
			    'Content-Type':     'application/x-www-form-urlencoded'
			}

			// Configure the request
			var options = {
			    url: 'https://testnet.blockchain.info/pushtx',
			    method: 'POST',
			    headers: headers,
			    form: {'tx': tx.build().toHex()}
			}

			// Start the request
			request(options, function (error, response, body) {
				 console.log(body)
				// console.log(error)
			    // console.log(response)
			    if (!error && response.statusCode == 200) {
			        // Print out the response body
			        //console.log(body)
			        let sqldata = ['1', address];
					let sql = `UPDATE keys
					            SET swept = ?
					            WHERE address = ?`;
					 
					db.run(sql, sqldata, function(err) {
					  if (err) {
					    return console.error(err.message);
					  }

					  console.log(`Row(s) updated: ${this.changes}`);
					 
					});
			    }
			})

		});

	});

 });
});


app.listen(3000, () => {
});