var mysql      = require('mysql');
var connection = mysql.createConnection({
    host     : 'us-east.connect.psdb.cloud',
    user     : 'i533wr86urp7f5c6t0q6',
    password : 'pscale_pw_jpm5auT3tYYEDrNnbeJvukHMXssQ0mV1AqU663Oj4gd',
    database : 'db_tweets'
  });
connection.connect();
exports.db = connection