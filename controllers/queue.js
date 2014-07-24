var kue = require('kue');
var nconf = require('nconf');
var q = kue.createQueue({
    db: nconf.get("redis:db")
});

module.exports = q;
