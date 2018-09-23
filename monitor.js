/*

This function monitors the block chain to see if out payments have been processed.

*/


//load express
const express = require('express');
//load body parser
const bodyParser = require('body-parser');
//set up block.io
var BlockIo = require('block_io');
var version = 2; // API version
var block_io = new BlockIo('9ccb-fad0-7811-4dfb', 'TFcce3dNxcfk7E3D', version);
//init it
const app = express();

//store the address, we will replace this with the entry's in the database later.
var address = "mqJGG1gHREwsUHbcdjVDWniYymJ8er5Rg6";

/*

We are going to use Block.io to check the address and see if the payment has been sent.
This is the same address for when we where coding generate.js so we know it has 0.01 BTC in it. 

Again we are relying on a 3rd party but this time it is less of a concern as all we are doing is using it
to check the blockchain we can verify this against a number of sources and it is a whole lot easier than 
installing our own full node and check that instead.  That said we will be building a full node and doing exactly that 
in a later tutorial.

*/

block_io.get_address_balance({'address': address}, function (error, data)
{
	//some kind of error, deal with it (literately )
  	if (error) return console.log("Error occurred:", error.message);
  	//store the balance
  	//note: The way we are using this we are only every using this address once so it should never have a higher balance than
  	//		what we are looking for.  Though it is not impossible a user sent to much or someone sent some Bitcoin to you by 
  	//		mistake.  If this is the case then you may want to put in some checks for this. I am not going to. 
  	var balance = data.data.available_balance;
  	//store the pending balance
  	var pendingbalance = data.data.pending_received_balance;
  	//debug
  	//console.log(balance);
  	//console.log(pendingbalance);
  	if (balance > 0)
  	{
  		//console.log('we got it');
  		//update the database that the payment is successful
  	}
  	else
  	{
  		//Incase you want to start ordering process or something on a pending balance this is where you would put that code
  		//for simplicty I am waiting until the balance has actually been confirmed.
  		if (pendingbalance > 0)
  		{
  			console.log('awaiting confirmation for '+address)
  		}
  	}
});


app.listen(3000, () => {
});