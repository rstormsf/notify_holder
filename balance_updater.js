
require('dotenv').config()
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./db.sqlite');
const Web3 = require('web3')

const {
  RPC_URL
} = process.env

const provider = new Web3.providers.HttpProvider(RPC_URL)
const ERC20abi = require('./abis/ERC20.abi.json');


const web3 = new Web3(provider)

async function main(){
  const TOKEN_ADDRESS = await readTokenAddress()
  
  const addresses = await readAddresses()
  const erc20 = new web3.eth.Contract(ERC20abi, TOKEN_ADDRESS)

  const blockNumber = await web3.eth.getBlockNumber();
  const db_block = await readLastBlockDb()
  if(db_block !== blockNumber){
    console.log('db', db_block, blockNumber)
    await writeDb(blockNumber)

    addresses.forEach(async (address) => {
      
      const balance = await erc20.methods.balanceOf(address).call();
      writeBalanceDb(balance, address)
    })
  }
  
  
  console.log(await readAddress())
}
main()

async function writeDb(blockNumber){
  db.serialize(function() {
    var stmt = db.prepare("UPDATE lastBlock SET b_number = (?) WHERE id = 1");
    stmt.run(blockNumber);
    stmt.finalize();
  });
}

async function readLastBlockDb(){
  return new Promise((res, rej) => {
    db.serialize(function() {
      db.each("SELECT id, b_number FROM lastBlock", function(err, row) {
        res(row.b_number);
      });
    });
  })
}

async function writeBalanceDb(balance, address){
  db.serialize(function() {
    
    db.run("UPDATE addresses SET balance = ? WHERE address = ?", [balance, address]);
  });
}

async function readAddress(){
  return new Promise((res, rej) => {
    db.serialize(function() {
      db.each("SELECT address, balance FROM addresses", function(err, row) {
        console.log(`${row.address} : ${row.balance}`);
      });
    });
  })
}

async function readTokenAddress(){
  return new Promise((res, rej) => {
    db.serialize(function() {
      db.all("SELECT value FROM tokenaddress", function(err, rows) {
        if(err){
          console.log(err);
          rej(err);
        }
        res(rows[0].value);
      });
    });
  })
}

async function readAddresses(){
  return new Promise((res, rej) => {
    db.serialize(function() {
      db.all("SELECT address FROM addresses", function(err, rows) {
        rows = rows.map((row) => row.address)
        res(rows);
        console.log(err);
      });
    });
  })
}