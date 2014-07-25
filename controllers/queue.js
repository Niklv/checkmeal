var kue = require('kue');
var nconf = require('nconf');
var app = kue.app;

var jobs = kue.createQueue({
    db: nconf.get("redis:db")
});


module.exports.jobs = jobs;
module.exports.app = app;
