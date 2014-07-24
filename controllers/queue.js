var kue = require('kue');
var nconf = require('nconf');
var q = kue.createQueue({
    prefix: 'q',
    redis: nconf.get("redis")
});
