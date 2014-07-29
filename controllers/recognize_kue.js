var _ = require('lodash');
var kue = require('kue');
var Job = kue.Job;
var JobInfo = require('./../models').JobInfo;
var RecognizeJob = require('./recognize_job');
var nconf = require('nconf');
var log = require('./log')(module);
var app = kue.app;


var jobs = kue.createQueue({
    db: nconf.get('redis:db')
});

jobs.process('recognize', function (job, done, ctx) {
    //TODO: save image
    /*JobInfo.update({_id: job.data.mongo_id}, {state: 'active'}, function (err, data) {
        //TODO: handle ERROR!
        job.log('Started');
        job.log('Start reco process');
        done(null, 'RESULT FUCK YEAH');
    });*/
    job.log('PROCESS STATE=', job.state);
    done(null, 'RESULT FUCK YEAH');

});

jobs.on('job complete', function (id, result) {
    Job.get(id, function (err, job) {
        if (err) {
            log.error(err.stack);
            return;
        }
        job.log('Done, Result:', result);
        //TODO: get log and save to mongo!
        /*JobInfo.update({_id: job.data.mongo_id}, {state: 'complete'}, function (err, data) {
         //TODO: handle ERROR!
         job.remove(function (err) {
         if (err) throw err;
         job.log('Removed');
         });
         });*/

    });
}).on('job failed', function (id, data) {
    Job.get(id, function (err, job) {
        if (err) {
            log.error(err.stack);
            return;
        }
        job.log('FAILED');
        job.log('Data:', data);
        log.error(data);
        //TODO: add Error! get log and save to mongo!
        /*JobInfo.update({_id: job.data.mongo_id}, {state: 'failed'}, function (err, data) {
         //TODO: handle ERROR!
         job.remove(function (err) {
         if (err) throw err;
         job.log('Removed');
         });
         });*/
    });
});


function startRecognizeJob(fileInfo, cb) {
    if (!fileInfo || !_.isObject(fileInfo))
        return cb(new Error('No file provided'), null);
    var job = new RecognizeJob(fileInfo).save(function (err) {
        if (err)
            job.log('Error saving to redis', err.stack);
        else
            job.log('Saved To Redis');
        cb(err);
    });

}

function shutdown(cb) {
    log.info('Stop jobs');
    jobs.shutdown(function (err) {
        log.info('Kue is shut down.', err || '');
        cb && cb();
    }, 2000);

}

module.exports.jobs = jobs;
module.exports.app = app;
module.exports.startRecognizeJob = startRecognizeJob;
module.exports.shutdown = shutdown;
