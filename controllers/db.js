var mongoose = require('mongoose');
var nconf = require('nconf');
var Grid = require('gridfs-stream');
Grid.mongo = mongoose.mongo;
var log = require('./log')(module);

module.exports.connect = function () {
    mongoose.connect(nconf.get("mongo:url"), {
        db: { native_parser: true},
        user: nconf.get("mongo:user"),
        pass: nconf.get("mongo:pass")
    });

    mongoose.connection.on('error', function (err) {
        log.error('MongoDB connection error:', err.message);
        throw err;
    });

    mongoose.connection.once('open', function () {
        log.info("Connected to MongoDB");
    });
};

module.exports.disconnect = function (cb) {
    log.info("Stop mongo connection");
    mongoose.connection.close(function (err) {
        if (err)
            log.error(err.stack);
        log.info("Mongo connection is closed.");
        cb && cb();
    });
};