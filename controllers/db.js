var nconf = require('nconf');
var backoff = require('backoff');
var mongoose = require('mongoose');
var log = require('./log')(module);

var options = {
    db: { native_parser: true},
    user: nconf.get('mongo:user'),
    pass: nconf.get('mongo:pass')
};

function connect() {
    mongoose.connection.removeListener('error', reconnect);
    var connectBackoff = backoff.call(tryConnectToMongo, function (err) {
        if (err) {
            log.error('MongoDB connection error: ' + err.stack);
            throw err;
        } else {
            log.info("Connected to Mongo");
            mongoose.connection.on('error', reconnect);
        }
    });
    connectBackoff.setStrategy(new backoff.ExponentialStrategy({
        initialDelay: 200
    }));
    connectBackoff.failAfter(5);
    connectBackoff.on('backoff', connectionFail);
    connectBackoff.start();
}

function tryConnectToMongo(done) {
    mongoose.connect(nconf.get('mongo:url'), options, done);
}

function connectionFail(num, delay, err) {
    log.info('Mongo connection attempt %d delay %dms', num, delay);
    log.error('Mongo connection attempt error: ' + (err ? err.message : "unknown error"));
}

function reconnect(err) {
    if (err)
        log.error('MongoDB connection error: ' + err.stack);
    disconnect(connect);
}

function disconnect(cb) {
    log.info('Close mongo connection');
    mongoose.disconnect(function (err) {
        if (err)
            log.error(err.stack);
        log.info('Mongo connection is closed');
        cb && cb();
    });
}


module.exports.isReady = function () {
    return mongoose.connection.readyState === 1;
};

module.exports.connect = connect;
module.exports.disconnect = disconnect;