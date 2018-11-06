//load bitcoin core
const Client = require("bitcoin-core");
//open a connection to the RPC client
const client = new Client({
  host: "127.0.0.1",
  port: 18332,
  username: "test",
  password: "test"
});

//1 = testnet
//2 = mainnet
const network = "1";

//load SQLlite (use any database you want or none)
const sqlite3 = require("sqlite3").verbose();
//open a database connection
let db = new sqlite3.Database("./db/db.db", err => {
  if (err) {
    console.error(err.message);
  }
});

var api = function() {
  /*
  *
  *  This function generate a new address
  *
  */
  this.generateAddress = function generateAddress(uid,res)
  {
    //unlock the wallet
    client.walletPassphrase(process.env.walletpassphrase, 10).then(() => {
      //create a new address in theaccount account :]
      client.getNewAddress(process.env.walletaccount).then(address => {
        //debug
        //console.log(address);

        //insert it into the database
        db.run(
          `INSERT INTO sessions(address,userid,net) VALUES(?,?,?)`,
          [address, uid, network],
          function(err) {
            if (err) {
              //debug
              //return console.log(err.message);

              //return error
              res.send(JSON.stringify({ error: err.message }));
              return;
            }
            //return the address
            res.send(JSON.stringify({ address: address }));
          }
        );
        client.walletLock();
        return;
        });
      });
    }


  /*
	*
	*	This function check if payment has been sent to the address
	*
	*/
  this.monitor = function monitor(address, res) {
    //call the recieved by address RPC call
    client.getReceivedByAddress(address).then(result => {
      //check it is more tha 0
      //note may want to check confirmations here
      if (result > 0) {
        //build a data array
        let data = ["1", result, address];
        //build the query
        let sql = `UPDATE sessions
				          SET processed = ?,
				            amount = ?
				          WHERE address = ?`;
        //run the query
        db.run(sql, data, function(err) {
          if (err) {
            return console.error(err.message);
          }
          //retun response
          res.send(JSON.stringify({ status: "confirmed" }));
          //todo: send the email confirmations.
        });
      } else {
        //return error
        res.send(JSON.stringify({ status: "not confirmed" }));
      }
    });
  };

  /*
	*
	*	This function moves a payment to a cold storge address
	*
	*/
  this.sweep = function sweep(address, res) {
    //set the headers
    res = helper.setHeaders(res);

    let sqldata = [0];
    let sql = `select * from coldstorageaddresses where used = ?`;

    //get a cold storage address
    db.get(sql, sqldata, (err, result) => {
      if (err) {
        return console.error(err.message);
      }
      //save the address
      var coldstorageaddress = result.address;
      //get the sweep address
      //unlock the wallet
      client.walletPassphrase(process.env.walletpassphrase, 10).then(() => {
        //get the unspent transaxtions for the address we are intrested in.
        client.listUnspent(1, 9999999, [address]).then(result => {
          //debug
          //console.log('listUnspent')
          //console.log(result)

          //get the private key
          client.dumpPrivKey(req.query.address).then(pkey => {
            //debug
            //console.log(pkey)
            //console.log(result)

            //check if there are any
            if (result.length == 0) {
              //debug
              //console.log(result);

              //exit gracefully
              res.send(
                JSON.stringify({
                  result: "nothing to sweep no unspent transactions"
                })
              );
              return;
            } else {
              //debug
              //console.log(result[0])

              //check the confirmation count
              //note it is set to 1 for now as I want to play with it as soon as possible.  It should 3 - 6 when we are happy
              if (result[0].confirmations >= 1) {
                //estimate fee
                client.estimateSmartFee(6).then(fee => {
                  //debug
                  //console.log('fee')
                  //console.log(fee)

                  //work out the amount to send
                  var amounttosend = result[0].amount - fee.feerate;
                  amounttosend = amounttosend.toFixed(8);
                  //debug
                  //console.log(amounttosend)
                  //return

                  //create raw transaction
                  /*
      		          we are in a catch 22 here 
      		          Unhandled rejection RpcError: signrawtransaction is deprecated and will be fully removed in v0.18. To use signrawtransaction in v0.17,
      		          restart bitcoind with -deprecatedrpc=signrawtransaction.
      		          Projects should transition to using signrawtransactionwithkey and signrawtransactionwithwallet before upgrading to v0.18
      		          but v0.17 does not support signrawtransactionwithkey so we wil update when v0.18 comes out

      		          Innputs

      		          txid: the transation id you want to use as your input (from listUnspent)
      		          vout: the transaciton id to you want to use as your input (from listUnspent)

      		          Output

      		          address to send to
      		          amount to send      
    		          */
                  client
                    .createRawTransaction(
                      [{ txid: result[0].txid, vout: 0 }],
                      [{ [coldstorageaddress]: amounttosend }]
                    )
                    .then(txhash => {
                      //debug
                      //console.log('txhash');
                      //console.log(txhash)

                      //sign it
                      //note may have to trap for errors
                      client
                        .signRawTransaction(
                          txhash,
                          [
                            {
                              txid: result[0].txid,
                              vout: 0,
                              amount: result[0].amount,
                              scriptPubKey: result[0].scriptPubKey,
                              redeemScript: result[0].redeemScript
                            }
                          ],
                          [pkey]
                        )
                        .then(signed => {
                          //debug
                          //console.log('signed');
                          //console.log(signed);

                          //broadcast it
                          //note may have to trap for errors
                          client
                            .sendRawTransaction(signed.hex)
                            .then(broadcasted => {
                              //debug
                              //console.log('broadcasted');
                              //console.log(broadcasted);

                              //build sql
                              let sqldata = ["1", address];
                              let sql = `UPDATE sessions
	                        SET swept = ?
	                        WHERE address = ?`;

                              //run sql
                              db.run(sql, sqldata, function(err) {
                                if (err) {
                                }
                                //update the address in cold storage so it is not used again.
                                //build sql
                                let sqldata = [0, coldstorageaddress];
                                let sql = `UPDATE coldstorageaddresses
	                          SET used = ?
	                          WHERE coldstorageaddress = ?`;

                                //run sql
                                db.run(sql, sqldata, function(err) {
                                  if (err) {
                                  }
                                  //lock wallet
                                  client.walletLock();
                                  //return status
                                  res.send(JSON.stringify({ status: "swept" }));
                                  return;
                                });
                              });
                            });
                        });
                    });
                });
              } else {
                //lock wallet
                client.walletLock();
                //return status
                res.send(
                  JSON.stringify({
                    status:
                      "not enough confirmations :" + result[0].confirmations
                  })
                );
                return;
              }
            }
          });
        });
      });
    });
  };


};
exports.api = api;
