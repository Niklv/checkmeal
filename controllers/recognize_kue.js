var _ = require('underscore');
var kue = require('kue');
var Job = kue.Job;
var JobInfo = require('./../models').JobInfo;
var nconf = require('nconf');
var log = require('./log')(module);
var app = kue.app;

//Override log method
Job.prototype.original_log = kue.Job.prototype.log;
Job.prototype.log = function () {
    log.info.apply(this, _.union(["[Job" + this.id + "]"], arguments));
    this.original_log.apply(this, arguments);
};

var jobs = kue.createQueue({
    db: nconf.get("redis:db")
});

jobs.process('recognize', function (job, done, ctx) {
    //TODO: save image
    JobInfo.update({_id: job.data.mongo_id}, {state: "active"}, function (err, data) {
        //TODO: handle ERROR!
        job.log("Started");
        job.log("Start reco process");
        done(null, "RESULT FUCK YEAH");
    });

});

jobs.on('job complete', function (id, result) {
    Job.get(id, function (err, job) {
        if (err) {
            log.error(err.stack);
            return;
        }
        job.log("Done, Result:", result);
        //TODO: get log and save to mongo!
        JobInfo.update({_id: job.data.mongo_id}, {state: "complete"}, function (err, data) {
            //TODO: handle ERROR!
            job.remove(function (err) {
                if (err) throw err;
                job.log("Removed");
            });
        });

    });
}).on('job failed', function (id, data) {
    Job.get(id, function (err, job) {
        if (err) {
            log.error(err.stack);
            return;
        }
        job.log("FAILED");
        job.log("Data:", data);
        log.error(data);
        //TODO: add Error! get log and save to mongo!
        JobInfo.update({_id: job.data.mongo_id}, {state: "failed"}, function (err, data) {
            //TODO: handle ERROR!
            job.remove(function (err) {
                if (err) throw err;
                job.log("Removed");
            });
        });
    });

});


function startRecognizeJob(file, cb) {
    if (!file || !_.isObject(file))
        return cb(new Error("No file provided"), null);
    var jobInfo = new JobInfo({
        originalname: file.originalname,
        name: file.name,
        encoding: file.encoding,
        mimetype: file.mimetype,
        extension: file.extension,
        size: file.size,
        truncated: file.truncated,
        creator: file.creator,
        createdAt: file.createdAt,
        state: "queued"
    });
    jobInfo.save(function (err, jobInfo) {
        //TODO: handle ERROR!
        log.info("Mongo alias");
        var job = jobs.create('recognize', {title: "Recognize " + jobInfo._id + " " + file.originalname,
            filename: file.name,
            mongo_id: jobInfo._id
        }).save(function (err) {
            //TODO: handle ERROR!
            job.log("Saved To Redis");
            cb(err, job.data.mongo_id);
        });
    });
}

function shutdown(cb) {
    log.info("Stop jobs");
    jobs.shutdown(function (err) {
        log.info('Kue is shut down.', err || '');
        cb && cb();
    }, 2000);

}

module.exports.jobs = jobs;
module.exports.app = app;
module.exports.startRecognizeJob = startRecognizeJob;
module.exports.shutdown = shutdown;
