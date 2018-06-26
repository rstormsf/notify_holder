rm db.sqlite; touch db.sqlite

cron
node balance_updater.js
node checkBalances.js

node bot.js