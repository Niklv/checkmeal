var _ = require('underscore');
var async = require('async');
var exec = require("exec");
var nconf = require("nconf");
var log = require('./log')(module);

var jobs = require('./queue').jobs;


jobs.process('recognize', function (job, done) {
    log.info("Job" + job.id + " is started");
    log.info("Start reco process");
    done(null, "RESULT FUCK YEAH");
});

function recognize(files, cb) {
    if (!files)
        return cb && cb(new Error("No files provided"), null);
    if (_.isArray(files)) {
        async.map(files, function (file, done) {
            var job = jobs.create('recognize', {title: "Recognize " + file.originalname,
                filename: file.name
            }).save(function (err) {
                done(err, job.id);
            });
        }, cb);
    } else if (_.isObject(files)) {
        var job = jobs.create('recognize', {title: "Recognize " + files.originalname,
            filename: files.name
        }).save(function (err) {
            cb(err, job.id);
        });
    } else
        return cb(new Error("No files provided"), null);
}

module.exports = recognize;
