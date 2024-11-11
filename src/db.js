const mysql = require('mysql2/promise');
const Config = require('./config');
const config = new Config('/etc/gnudialer.conf');

const db = mysql.createPool({
    host: config.get('MySQL.host'),
    port: config.get('MySQL.port'),
    user: config.get('MySQL.user'),
    password: config.get('MySQL.password'),
    database: config.get('MySQL.database')
});

module.exports = db;