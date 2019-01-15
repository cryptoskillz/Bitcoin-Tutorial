/*
  todo: *more details in the section where this todo is required
  Cache pay to adddress so it will work with no Bitcoin Core
  Check that bticoin is running and not frozen before calling it
  Finish Mock API calls
  Finish email temaplates.  Note complitaing removing these complelty out of the database.

  update generateaddress function to use the getBTCaddress an GetLigtAddres functions instead of genrating on its own
  this function now is now designed to override the one we get at default so I actually may repalce it and use it 
  to only return the cached address we geneated at the start for simplicty. This would have the downside of it not 
  working outside of SR.js of course. 

*/
const config = require('./config');
//open a database connection
//load SQLlite (use any database you want or none)
const sqlite3 = require("sqlite3").verbose();
let db = new sqlite3.Database("./db/db.db", err => {
  if (err) {
    console.error(err.message);
  }
});



//load the generic functions
//note we could ass this down i am not sure which is th emost efficient way to do this to be honest.  I shall look into that. 
var generichelper = require('./generic.js').Generic;
var generic = new generichelper();

var api = function() {

  function getBTCAddress(sessionid = '')
  {

    //unlock the wallet
    //debug
    //console.log(process.env.walletpassphrase)
    client.walletPassphrase(process.env.WALLETPASSPHRASE, 10).then(() => {
      //create a new address in theaccount account :]
      client.getNewAddress(process.env.WALLETACCOUNT).then(address => {
          //debug
          //console.log(address);
          //console.log(sessionid);

          if (sessionid != '')
          {
            //update the session table
            let data = [address, sessionid];
            let sql = `UPDATE sessions SET btcaddress = ? WHERE sessionid = ?`;
            db.run(sql, data, function(err) {
              if (err) {
                return console.error(err.message);
              }
            });
          }
        
        });
      });
  }

  function getLightAddress(sessionid = '')
  {
    let address = '12345';
    if (sessionid != '')
    {
      //update the session table
      let data = [address, sessionid];
      let sql = `UPDATE sessions SET lightaddress = ? WHERE sessionid = ?`;
      db.run(sql, data, function(err) {
        if (err) {
          return console.error(err.message);
        }
      });
    }

  }


  /*

    This function generate session for sr.js to use to intreact with the server.

  */
  this.userSession = function userSession(req,res)
  {
    //laods the UID 
    let uuidv1 = require('uuid/v1');
    //get a session id
    let sessionid  = uuidv1();
    //debug
    //let sessionid  = "44b2f5c0-189a-11e9-91a4-a59245cc45cb";
    //build the SQL 
    let sqldata = [sessionid ];
    let sql = `select * from sessions where sessionid = ?`;

    //run it and see if it is in the database
    db.get(sql, sqldata, (err, result) => {
      if (err) 
      {
        //there was an error
        res.send(JSON.stringify({ error: err.message }));
        return;
      }
      //debug
      //console.log(result);

      //check that it is not in the database
      //note : we could do this better by checking the array length. 
      if (result == undefined )
      {
        //get the timestamp
        var ts = Math.round((new Date()).getTime() / 1000);
        //store in the sessions database
        db.run(
          `INSERT INTO sessions(sessionid,userid,net,sessiontime) VALUES(?,?,?,?)`,
          [sessionid, req.query.uid, process.env.NETWORK,ts],
          function(err) {
            if (err) {
              //there was an error
              res.send(JSON.stringify({ error: err.message }));
              return;
            }
            //out the session id
            res.send(JSON.stringify({ sessionid: sessionid }));
            //note here we could generate a BTC / LIGHT address and cache it on the server removing the potential delays
            //then it could be called JIT when it is required, this would work if we decide to extened out to many API's
            getBTCAddress(sessionid);
            getLightAddress(sessionid);
          }
        );
      }
      else
      {
        //we go again as the session id was in the database
        this.userSession(req,res);
      }
     

    });
  }

   /*
  *
  * This function stores the user details 

    note : Check why it is storing adddress in this table (not required)
  *
  */
  this.storeUserDetails = function storeUserDetails(req,res)
  {
    //console.log(req.query);
    let data = [req.query.address];
    //console.log(data)
    let sql = `SELECT * FROM order_product where address = "`+req.query.address+`"`;
    //debug

    db.get(sql, [], (err, result) => {
      //console.log(result)
      if (err) {
        console.log(err)
      }
      let data = [result.id];
      let sql = `delete FROM order_meta WHERE productid = ?`;
      db.run(sql, data, function(err) {
        if (err) {
          return console.error(err.message);
        }
        let data = [result.id];
        let sql = `delete FROM order_product_meta WHERE productid = ?`;
        db.run(sql, data, function(err) {
            if (err) {
              return console.error(err.message);
            }
            for (var metaname in req.query) 
            {

                if (req.query.hasOwnProperty(metaname)) 
                {
                    var metavalue = req.query[metaname]
                    
                    if(metaname.indexOf("sr-product-") > -1) 
                    {
                      //console.log('prod:'+req.query[metaname])
                      //inser into proiduct meta
                      if ((req.query[metaname] != '') && (req.query[metaname] != "undefined"))
                      {
                        metaname = metaname.replace("sr-product-", "");
                        //insert into oder meta
                        db.run(
                          `INSERT INTO order_product_meta(productid,metaname,metavalue) VALUES(?,?,?)`,
                          [
                            result.id,
                            metaname,
                            metavalue
                          ],
                          function(err) {
                            if (err) {
                              return console.log(err.message);
                            }
                          }
                        );
                      }

                    }
                    else
                    {
                        //note we should change this to sr-order so it is not just an if else check in the future
                        //debug
                        //console.log('order:'+req.query[metaname])
                        //note the undefined should be cleaned in sr.js but does hurt to also check here
                        if ((req.query[metaname] != '') && (req.query[metaname] != "undefined"))
                        {
                          metaname = metaname.replace("sr-", "");
                          //insert into oder meta
                          db.run(
                            `INSERT INTO order_meta(productid,metaname,metavalue) VALUES(?,?,?)`,
                            [
                              result.id,
                              metaname,
                              metavalue
                            ],
                            function(err) {
                              if (err) {
                                return console.log(err.message);
                              }
                            }
                          );
                        }
                      //debug
                      //console.log(metaname, metavalue);
                    }

                }
            }
            res.send(JSON.stringify({ status: "ok" }));
          });
        });
    });
  }


  /*
  *
  * This function stores the product in the database
  *
  *  TODO: make sure we have an adddress before we store the product without there is no way to process the order
           and we will get result.id errors this falls into the same area as caching addrress we could also benefot 
           from having a check to see if bitcoin core is running correctly.
  *
  */
  this.storeProduct = function storeProduct(req,res)
  {
    //check if it is in the product table
    if (req.query.quantity == 0) {
      //delete the record
      let data = [req.query.address];
      let sql = `delete FROM order_product WHERE address = ?`;
      db.run(sql, data, function(err) {
        if (err) {
          return console.error(err.message);
        }
      });
    } else {
      //see if we have it already
      let sql =
        `SELECT * FROM order_product where address = "` + req.query.address + `"`;
      //debug
      //console.log(sql);

      db.all(sql, [], (err, rows) => {
        if (err) {
          throw err;
        }
        //check we have a result
        if (rows.length == 0) {
          //insert it
          //delete the record
          db.run(
            `INSERT INTO order_product(address,name,price,quantity) VALUES(?,?,?,?)`,
            [
              req.query.address,
              req.query.name,
              req.query.price,
              req.query.quantity
            ],
            function(err) {
              if (err) {
                return console.log(err.message);
              }
            }
          );
        } else {
          //update it
          let data = [req.query.quantity, req.query.address];
          let sql = `UPDATE order_product SET quantity = ? WHERE address = ?`;
          db.run(sql, data, function(err) {
            if (err) {
              return console.error(err.message);
            }
          });
        }
      });
    }
    //debug
    //console.log(req.query.name);
    //console.log(req.query.price);
    //console.log(req.query.quantity);
    //console.log(req.query.address);
    res.send(JSON.stringify({ status: "ok" }));
  }
  /*
  *
  *  This function generate a new address
  *
  *. Note if Bitcoin core is slow in returning an addresss this could have an adverse impact on the functionality
  *.      to aboid this we could cache a number of addresses ready to use in the database. 
  *
  */
  this.generateAddress = function generateAddress(uid,res)
  {
    //call the mock test
    var mockres = generic.mock(1,res);
    if (mockres == true)
      return;

    //unlock the wallet
    //debug
    //console.log(process.env.walletpassphrase)
    client.walletPassphrase(process.env.WALLETPASSPHRASE, 10).then(() => {
      //create a new address in theaccount account :]
      client.getNewAddress(process.env.WALLETACCOUNT).then(address => {
        //debug
        //console.log(address);

        //insert it into the database
        db.run(
          `INSERT INTO sessions(address,userid,net) VALUES(?,?,?)`,
          [address, uid, process.env.NETWORK],
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
            //client.walletLock();
          }
        );
        //client.walletLock();
        return;
        });
      });
    }


  /*
	*
	*	This function check if payment has been sent to the address
  *
  * todo: check client is running
          fix small amounts been written to the data base incorrectly (ie 0.00002000 as 2.0e-05) most likely we will have 
          parse it as a string before we write to the database
	*
	*/
  this.monitor = function monitor(address, res) {

    //call the recieved by address RPC call
    //console.log(address)
    client.getReceivedByAddress(address).then(result => {
      //check it is more tha 0
      //note may want to check confirmations here

      //debug
      //console.log(result);

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
          //send email to customer.
          //console.log('send email in monitor')
          generic.sendMail(2,'cryptoskillz@protonmail.com');
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

    let sqldata = [0];
    let sql = `select * from ecs_coldstorageaddresses where used = ?`;

    //get a cold storage address
    db.get(sql, sqldata, (err, result) => {
      if (err) {
        return console.error(err.message);
      }
      //save the address
      var coldstorageaddress = result.address;
      //get the sweep address
      //unlock the wallet
      client.walletPassphrase(process.env.WALLETPASSPHRASE, 10).then(() => {
        //get the unspent transaxtions for the address we are intrested in.
        client.listUnspent(1, 9999999, [address]).then(result => {
          //debug
          //console.log('listUnspent')
          //console.log(result)

          //get the private key
          client.dumpPrivKey(address).then(pkey => {
            //debug
            //console.log('pkey')
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
              if (result[0].confirmations >= process.env.CONFIRMATIONS) {
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

                  //console.log(coldstorageaddress)
                  client
                    .createRawTransaction(
                      [{ txid: result[0].txid, vout: result[0].vout }],
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
                              vout: result[0].vout,
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
                                let sqldata = ["1", coldstorageaddress];
                                let sql = `UPDATE ecs_coldstorageaddresses
	                          SET used = ?
	                          WHERE ecs_coldstorageaddress = ?`;
                            //console.log(coldstorageaddress)
                            //console.log(sql)

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
