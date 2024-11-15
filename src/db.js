const mysql = require('mysql2/promise');
const Config = require('./config');
const config = new Config('/etc/gnudialer.conf');

const db = mysql.createPool({
    host: config.get('database.mysql_host'),
    port: config.get('database.mysql_port'),
    user: config.get('database.mysql_username'),
    password: config.get('database.mysql_password'),
    database: config.get('database.mysql_dbname')
});

module.exports = db;