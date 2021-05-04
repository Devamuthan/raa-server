const bluebird = require('bluebird')

const connectionConfig = {
    host: 'localhost',
    user: 'root',
    password: 'password',
    port: 3306,
    database: 'raa',
    Promise: bluebird
}

module.exports = connectionConfig