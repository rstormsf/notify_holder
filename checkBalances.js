var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./db.sqlite');
const Web3Utils = require('web3-utils');

const Telegraf = require('telegraf')

const bot = new Telegraf(process.env.BOT_TOKEN)
const chatId = process.env.CHAT_ID;

async function main() {
  let threshold = await readThreshold();
  threshold = new Web3Utils.BN(threshold.value.toString());
  const addresses = await readAddress();
  
  addresses.forEach(async (record) => {
    const balance = new Web3Utils.BN(record.balance);
    const timeNow = Math.floor(Date.now()/1000);
    if(threshold.gt(balance)){
      console.log('balance below', record.balance, threshold.toString(), timeNow)
      const notif = await readNotification(record.address);
      console.log(notif)
      if(notif.length === 0){
        console.log('writing')
        notifyTg(`Address ${record.address} has below threshold(${Web3Utils.fromWei(threshold.toString())}) balance: ${Web3Utils.fromWei(record.balance)}`)
        await writeNotification(record.address, timeNow);
      } else {
        const timeDiff = timeNow - Number(notif[0].value);
        const hours12 = 1800;
        if(timeDiff > hours12){
          console.log('notifying')
          notifyTg(`Address ${record.address} has below threshold(${Web3Utils.fromWei(threshold.toString())}) balance: ${Web3Utils.fromWei(record.balance)}`)
          await updateNotification(record.address, timeNow);
        }
      }
    }
  })
}

async function readThreshold(){
  return new Promise((res, rej) => {
    db.serialize(function() {
      db.all("SELECT value FROM threshold", function(err, rows) {
        if(err){
          console.log(err);
          rej(err);
        }
        res(rows[0]);
      });
    });
  })
}


async function readAddress(){
  return new Promise((res, rej) => {
    db.serialize(function() {
      db.all("SELECT address, balance FROM addresses", function(err, rows) {
        if(err) {
          rej(err)
        }
        res(rows);
      });
    });
  })
}

async function readNotification(address){
  return new Promise((res, rej) => {
    db.serialize(function() {
      db.all(`select * from notifications 
      INNER JOIN addresses on notifications.address = addresses.address
      WHERE notifications.address = ?`, [address], function(err, rows) {
        if(err) {
          rej(err)
        }
        res(rows);
      });
    });
  })
}

async function writeNotification(address, timestamp){
  return new Promise((res, rej) => {
    db.serialize(function() {
      db.run(`INSERT OR IGNORE INTO notifications (address,value) VALUES(?,?)`, [address, timestamp], function(err, rows) {
        if(err) {
          rej(err)
        }
        res(rows);
      });
    });
  })
}
async function updateNotification(address, timestamp){
  return new Promise((res, rej) => {
    db.serialize(function() {
      db.run(`UPDATE notifications SET value = ? WHERE address = ?`, [timestamp, address], function(err, rows) {
        if(err) {
          rej(err)
        }
        res(rows);
      });
    });
  })
}
async function notifyTg(msg) {
  bot.telegram.sendMessage(chatId, msg);
}

main();