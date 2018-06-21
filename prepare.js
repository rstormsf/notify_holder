var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./db.sqlite');
var addresses = require('./addresses.json');

db.serialize(function() {
  db.run("CREATE TABLE addresses (address TEXT NOT NULL UNIQUE PRIMARY KEY, balance TEXT)");

  var stmt = db.prepare("INSERT INTO addresses VALUES (?, ?)");
  for (var i = 0; i < addresses.length; i++) {
      stmt.run([addresses[i], '0']);
  }
  stmt.finalize();

  db.run("CREATE TABLE lastBlock (id NUM, b_number NUM)");
  var stmt2 = db.prepare("INSERT INTO lastBlock VALUES (?, ?)");
  stmt2.run(1, 0);
  stmt2.finalize();

  db.run("CREATE TABLE threshold (id NUM, value TEXT)");
  var stmt2 = db.prepare("INSERT INTO threshold VALUES (?, ?)");
  stmt2.run(1, 0);
  stmt2.finalize();

  db.run("CREATE TABLE tokenaddress (id NUM, value TEXT)");
  var stmt2 = db.prepare("INSERT INTO tokenaddress VALUES (?, ?)");
  stmt2.run(1, 0);
  stmt2.finalize();

  db.run("CREATE TABLE notifications (address TEXT UNIQUE NOT NULL, value TEXT, FOREIGN KEY(address) REFERENCES addresses(address) ON DELETE CASCADE ON UPDATE CASCADE)");

  db.each("SELECT rowid AS id, address, balance  FROM addresses", function(err, row) {
    console.log(row.id + ": " + row.address, row.balance);
  });

});

db.close();