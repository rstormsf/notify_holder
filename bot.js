const Telegraf = require('telegraf')
const session = require('telegraf/session')
const Stage = require('telegraf/stage')
const Scene = require('telegraf/scenes/base')
const { leave } = Stage
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./db.sqlite');
const Web3Utils = require('web3-utils');
require('dotenv').config()

const bot = new Telegraf(process.env.BOT_TOKEN)
const isAdmin = async function(ctx, next) {
  console.log(ctx.from.username)
  if(ctx.from.username === 'rstormsf' || ctx.from.username === 'collincrypto') {
    return await next()
  } else {
    return ctx.reply('Only admin can manage this chat');
  }
}


//set tokenaddress
const setTokenAddress = new Scene('set_token_address')
setTokenAddress.enter(async (ctx) => {
  return ctx.reply(`Please enter new token address to watch
  Enter /cancel to exit
  `)
})
setTokenAddress.leave(async (ctx) => {
  const tokenaddress = await readTokenAddress();
  return ctx.reply(`Current token address is: ${JSON.stringify(tokenaddress,  null, "\n")}`)
})
setTokenAddress.on('message', (ctx) => {
  const newValue = ctx.update.message.text
  if(!Web3Utils.isAddress(newValue)){
    ctx.reply('Wrong value. Has to be valid ETH address')
    return ctx.scene.reenter();
  } else {
    writeNewTokenAddress(newValue);
    return ctx.scene.leave()
  }
})

//set threshold
const setThreshold = new Scene('set_threshold')
setThreshold.enter(async (ctx) => {
  return ctx.reply(`Please enter new threshold
  Enter /cancel to exit
  `)
})
setThreshold.leave(async (ctx) => {
  const threshold = await readThreshold();
  return ctx.reply(`Current threshold (18 decimals) is:\n ${JSON.stringify(Web3Utils.fromWei(threshold.value),  null, "\n")}`)
})
setThreshold.on('message', (ctx) => {
  let newValue = ctx.update.message.text
  if(isNaN(newValue)){
    ctx.reply('Wrong value. Has to be number with token decimals applied. Example: decimals = 18. 1 = 10**18')
    return ctx.scene.reenter();
  } else {
    newValue = Web3Utils.toWei(newValue)
    writeNewThreshold(newValue);
    return ctx.scene.leave()
  }
})

// addeth scene
const addEthAddress = new Scene('add_eth_address')
addEthAddress.enter(async (ctx) => {
  
  return ctx.reply(`Please enter eth address to add
  Enter /cancel to exit
  `)
})
addEthAddress.leave(async (ctx) => {
  const addresses = await readAddress();
  return ctx.reply(`Current addresses ${addresses.length}: ${JSON.stringify(addresses,  null, " ")}`)
})
addEthAddress.on('message', (ctx) => {
  const address = ctx.update.message.text;
  if(Web3Utils.isAddress(address)){
    writeNewAddress(ctx.update.message.text);
    ctx.reply('Added!')
    return ctx.scene.leave()
  } else {
    ctx.reply('Wrong eth address')
    return ctx.scene.reenter();
  }
})

// remove scene
const removeEthAddress = new Scene('remove_eth_address')
removeEthAddress.enter(async (ctx) => {
  return ctx.reply(`Please enter eth address to remove
  Enter /cancel to exit
  `)
})
removeEthAddress.leave(async (ctx) => {
  const addresses = await readAddress();
  return ctx.reply(`Current addresses ${addresses.length}: ${JSON.stringify(addresses,  null, " ")}`)
})
removeEthAddress.on('message', (ctx) => {
  const newValue = ctx.update.message.text;
  if(Web3Utils.isAddress(newValue)) {
    deleteAddress(ctx.update.message.text);
    return ctx.scene.leave()
  } else {
    ctx.reply("not valid eth address");
    return ctx.scene.reenter();
  }
})


// Create scene manager
const stage = new Stage()
// Scene registration
stage.register(addEthAddress)
stage.register(removeEthAddress)
stage.register(setThreshold)
stage.register(setTokenAddress)
stage.command('cancel', leave())


bot.use(isAdmin);
bot.use(session())
bot.use(stage.middleware())
bot.start((ctx) => ctx.reply(`List of commands: \n 
/add_eth_address
/remove_eth_address
/show_addresses_to_watch
/set_threshold
/show_current_threshold
/set_token_address
/cancel - exit any command if already entered
`))
bot.help((ctx) => ctx.reply('Send me a sticker'))
bot.command('set_token_address', (ctx) => ctx.scene.enter('set_token_address'))
bot.command('set_threshold', (ctx) => ctx.scene.enter('set_threshold'))
bot.command('add_eth_address', (ctx) => ctx.scene.enter('add_eth_address'))
bot.command('remove_eth_address', (ctx) => ctx.scene.enter('remove_eth_address'))
bot.command('show_addresses_to_watch', async (ctx) => {
  const addresses = await readAddress();
  return ctx.reply(`Current addresses ${addresses.length}: ${JSON.stringify(addresses,  null, " ")}`)
})
bot.command('show_current_threshold', async (ctx) => {
  let threshold = await readThreshold();
  return ctx.reply(`Current threshold (18 decimals) is: ${JSON.stringify(Web3Utils.fromWei(threshold.value),  null, "\n")}`)
})

bot.startPolling()


async function readAddress(){
  return new Promise((res, rej) => {
    db.serialize(function() {
      db.all("SELECT address, balance FROM addresses", function(err, rows) {
        rows = rows.map(({address, balance}) => {
          return {address, balance: Web3Utils.fromWei(balance)}
        })
        res(rows);
        if(err){
          console.log(err);
        }
      });
    });
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

async function readTokenAddress(){
  return new Promise((res, rej) => {
    db.serialize(function() {
      db.all("SELECT value FROM tokenaddress", function(err, rows) {
        if(err){
          console.log(err);
          rej(err);
        }
        res(rows[0]);
      });
    });
  })
}

async function writeNewAddress(address) {
  try {
    var stmt = db.prepare("INSERT INTO addresses VALUES (?, ?)");
    stmt.run([address, '0'], (error, som) => console.log(error, som));
    stmt.finalize();
  } catch(e) {
    console.error(e);
  }
}

async function writeNewThreshold(threshold) {
  try {
    var stmt = db.prepare("UPDATE threshold SET value = ? WHERE id = 1");
    stmt.run([threshold], (error) => console.log(error));
    stmt.finalize();
  } catch(e) {
    console.error(e);
  }
}

async function writeNewTokenAddress(tokenaddress) {
  try {
    var stmt = db.prepare("UPDATE tokenaddress SET value = ? WHERE id = 1");
    stmt.run([tokenaddress], (error) => console.log(error));
    stmt.finalize();
  } catch(e) {
    console.error(e);
  }
}



async function deleteAddress(address) {
  var stmt = db.prepare("DELETE FROM addresses WHERE address = ?");
  stmt.run([address], (error) => console.log(error));
  stmt.finalize();
}